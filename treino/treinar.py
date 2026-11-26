"""
O treino: neuroevolução da fase 1 do currículo (só o ar, dias amenos).

    .venv\\Scripts\\python.exe -m treino.treinar --horas 9 --sementes 3
    .venv\\Scripts\\python.exe -m treino.treinar --retomar treino/saidas/<execucao>

A cada geração (o laço do estudo, em escala maior):
  1. clima novo, sorteado da semente da geração;
  2. as P redes e as regras fixas cultivam 35 dias, cada uma na sua estufa;
  3. nota em R$ de cada uma; melhor, mediana e regras vão para geracoes.json;
  4. elitismo, torneio, cruzamento e mutação: nasce a próxima geração.
A cada `--prova-cada` gerações, o campeão faz a PROVA: 10 climas fixos que o
treino nunca vê, contra as regras fixas. Campeão novo vira modelos/<id>.json e
ganha uma gravação do ciclo dele. Na geração 1, também o campeão dela e as
gravações das regras fixas e de "sem controle" no mesmo clima (passo 09).

Robustez para a noite: checkpoint a cada poucas gerações, --retomar, orçamento
de --horas, Ctrl+C salva antes de sair, log em arquivo. Os JSON seguem o
contrato (docs/contrato-dados.md) e são escritos por inteiro (escrever_json),
para o treino/nuvem.py nunca pegar um arquivo pela metade.
"""

from __future__ import annotations

import argparse
import logging
import os
import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

import torch

from controle.ciclo import simular_ciclo
from controle.controladores import Nada, RegrasFixas
from controle.metricas import Medidor
from controle.seguranca import Seguranca, lista_barradas
from simulador.clima import MINUTOS_POR_PASSO, PASSOS_POR_DIA, clima_ameno, empilhar
from simulador.estufa import Estufa
from treino.evolucao import Combinado, proxima_geracao
from treino.nuvem import FUSO_SP, agora_sp, escrever_json
from treino.rede import ARQUITETURA, ControladorRede, n_pesos, normalizacao, pesos_iniciais

SEMENTES_PROVA = tuple(range(10_000, 10_010))  # 10 climas que o treino nunca vê
SEMENTE_GRAVACAO = 12_345
CRITERIO = "nota acima das regras fixas em 90% dos climas de prova"
FASE = 1

log = logging.getLogger("treino")


@dataclass
class Config:
    semente: int = 7
    populacao: int = 1024
    elite: float = 0.05
    torneio: int = 3
    mutacao: float = 0.03
    dias: int = 35
    prova_cada: int = 25
    checkpoint_cada: int = 5
    onde: str = "notebook · processador"

    def contrato(self) -> dict:
        """O ConfigTreino do contrato."""
        return {"populacao": self.populacao, "elite": self.elite, "torneio": self.torneio,
                "mutacao": self.mutacao, "misturaFases": 0.0, "arquitetura": list(ARQUITETURA),
                "passoMinutos": MINUTOS_POR_PASSO}


# ---------------------------------------------------------------------------
# Avaliar, provar e gravar
# ---------------------------------------------------------------------------

def avaliar(pop: torch.Tensor, clima) -> tuple[torch.Tensor, float]:
    """As P redes e as regras fixas, juntas, no mesmo clima: (notas das redes, nota das regras)."""
    p = pop.shape[0]
    e = Estufa(p + 1, clima)
    m = simular_ciclo(e, Combinado((ControladorRede(pop), p), (RegrasFixas(), 1)))
    notas = m.nota(e.massa_por_pe)
    return notas[:p], float(notas[p])


def provar(pesos: torch.Tensor, dias: int) -> dict:
    """
    O campeão, as regras e "não fazer nada" nos climas de prova, numa simulação
    só (um clima por estufa). provaPorFase = fração dos climas em que o
    campeão vence as regras.
    """
    k = len(SEMENTES_PROVA)
    climas = [clima_ameno(dias, s) for s in SEMENTES_PROVA]
    e = Estufa(3 * k, empilhar(climas * 3))
    ctrl = Combinado((ControladorRede(pesos.expand(k, -1)), k), (RegrasFixas(), k), (Nada(), k))
    notas = simular_ciclo(e, ctrl).nota(e.massa_por_pe)
    campeao, regras, nada = notas[:k], notas[k:2 * k], notas[2 * k:]
    return {
        "campeao": float(campeao.mean()), "regras": float(regras.mean()), "nada": float(nada.mean()),
        "vence": float((campeao > regras).float().mean()),
        "massa": float(e.massa_por_pe[:k].mean()),
    }


def acoes_contrato(acoes: dict) -> dict:
    """As Acoes do contrato. Fase 1: a solução é fixa, então os atuadores dela ficam parados (bomba sempre ligada, como no NFT)."""
    ar = {k: round(float(acoes[k][0]), 3) for k in ("exaustor", "nebulizacao", "sombreamento", "luz")}
    return {**ar, "dosagemAB": 0.0, "dosagemAcido": 0.0, "reposicaoAgua": False, "bomba": True}


def gravar(controlador, gravacao_id: str, modelo_id: str, dias: int, tipo: str = "agente") -> dict:
    """
    Um controlador num ciclo de clima fixo (SEMENTE_GRAVACAO), passo a passo: o
    que leu, o que fez, o que foi barrado. Como todos (campeões, regras fixas e
    "sem controle") usam o mesmo clima, a comparação entre gravações é justa.

    Além dos passos, a gravação leva o que o dashboard não consegue tirar deles:
    a massa por pé no fim de cada dia (massaPorDia[0] é o transplante) e o
    resumo do ciclo (ResumoCiclo + a nota em R$), medidos pelo mesmo Medidor do
    treino. Assim nenhuma tela precisa estimar massa ou energia.
    """
    e, seg = Estufa(1, clima_ameno(dias, SEMENTE_GRAVACAO)), Seguranca()
    med = Medidor(1, e.ad)
    if hasattr(controlador, "reiniciar"):
        controlador.reiniciar()
    passos, massa = [], [round(float(e.massa_por_pe[0]), 1)]
    while not e.fim:
        obs = e.ler_sensores()
        pedidas = controlador.decidir(obs)
        acoes, barradas = seg.filtrar(pedidas, obs)
        passos.append({"leitura": e.leitura(0, "campeao"), "acoes": acoes_contrato(acoes),
                       "barradas": lista_barradas(0, pedidas, barradas)})
        e.acionar(acoes)
        med.registrar(obs, acoes, barradas)  # mesma ordem do simular_ciclo
        if e.passo % PASSOS_POR_DIA == 0:
            massa.append(round(float(e.massa_por_pe[0]), 1))
    resumo = {**med.resumo(0, gravacao_id, e.massa_por_pe), "nota": round(float(med.nota(e.massa_por_pe)[0]), 1)}
    return {"id": gravacao_id, "semente": SEMENTE_GRAVACAO, "modeloId": modelo_id, "controlador": tipo,
            "massaPorDia": massa, "resumo": resumo, "passos": passos}


def resumo_gravacao(g: dict, titulo: str, geracao: int | None) -> dict:
    """O ResumoGravacao (contrato) de uma gravação: a linha da lista, sem os passos."""
    return {"id": g["id"], "semente": g["semente"], "modeloId": g["modeloId"], "titulo": titulo,
            "criadaEm": agora_sp(), "passos": len(g["passos"]), "controlador": g["controlador"],
            "geracao": geracao, "resumo": g["resumo"]}


def gravar_referencias(prefixo: str, dias: int) -> list[tuple[dict, str]]:
    """As regras fixas e "sem controle" no clima da gravação: as réguas das gravações dos campeões."""
    return [
        (gravar(RegrasFixas(), f"{prefixo}-regras-gravacao", "regras-fixas", dias, "regras"), "Regras fixas"),
        (gravar(Nada(), f"{prefixo}-nada-gravacao", "sem-controle", dias, "nada"), "Sem controle"),
    ]


def modelo_contrato(modelo_id: str, geracao: int, pesos: torch.Tensor, vence: float) -> dict:
    """O Modelo do contrato: os pesos do campeão e a fração dos climas de prova em que venceu as regras."""
    return {"id": modelo_id, "geracao": geracao, "fase": FASE, "arquitetura": list(ARQUITETURA),
            "pesos": [round(v, 6) for v in pesos[0].tolist()], "provaPorFase": {str(FASE): vence}}


# ---------------------------------------------------------------------------
# O treino de uma semente
# ---------------------------------------------------------------------------

class Execucao:
    def __init__(self, pasta: Path, cfg: Config):
        self.pasta, self.cfg = pasta, cfg
        self.g = torch.Generator().manual_seed(cfg.semente)
        self.pop = pesos_iniciais(cfg.populacao, self.g)
        self.geracao = 0  # a última geração terminada
        self.geracoes: list[dict] = []
        self.melhor_prova = float("-inf")
        self.gravacoes: list[dict] = []
        self.iniciado_em = agora_sp()

    # ----- arquivos -----

    def salvar_estado(self, rodando: bool) -> None:
        escrever_json(self.pasta / "estado.json", {
            "rodando": rodando, "onde": self.cfg.onde, "faseAtual": FASE, "geracaoAtual": self.geracao,
            "iniciadoEm": self.iniciado_em, "criterioPassagem": CRITERIO, "inicioPorFase": {str(FASE): 1},
        })

    def salvar_checkpoint(self) -> None:
        """Tudo o que é preciso para continuar de onde parou (escrito por inteiro, como os JSON)."""
        tmp = self.pasta / "checkpoint.tmp"
        torch.save({"cfg": asdict(self.cfg), "pop": self.pop, "geracao": self.geracao, "rng": self.g.get_state(),
                    "geracoes": self.geracoes, "melhor_prova": self.melhor_prova, "gravacoes": self.gravacoes,
                    "iniciado_em": self.iniciado_em}, tmp)
        os.replace(tmp, self.pasta / "checkpoint.pt")

    @classmethod
    def retomar(cls, pasta: Path) -> "Execucao":
        # weights_only: só tensores, números e textos; um checkpoint adulterado não roda código
        ck = torch.load(pasta / "checkpoint.pt", weights_only=True)
        ex = cls(pasta, Config(**ck["cfg"]))
        ex.pop, ex.geracao, ex.geracoes = ck["pop"], ck["geracao"], ck["geracoes"]
        ex.melhor_prova, ex.gravacoes, ex.iniciado_em = ck["melhor_prova"], ck["gravacoes"], ck["iniciado_em"]
        ex.g.set_state(ck["rng"])
        return ex

    # ----- o laço -----

    def guardar_gravacao(self, g: dict, titulo: str, geracao: int | None) -> None:
        escrever_json(self.pasta / "gravacoes" / f"{g['id']}.json", g)
        self.gravacoes.append(resumo_gravacao(g, titulo, geracao))
        escrever_json(self.pasta / "gravacoes" / "indice.json", self.gravacoes)

    def salvar_campeao(self, campeao: torch.Tensor, vence: float) -> None:
        """modelos/<id>.json e a gravação do ciclo dele."""
        modelo_id = f"{self.pasta.name}-g{self.geracao}"
        escrever_json(self.pasta / "modelos" / f"{modelo_id}.json",
                      modelo_contrato(modelo_id, self.geracao, campeao, vence))
        g = gravar(ControladorRede(campeao), f"{modelo_id}-gravacao", modelo_id, self.cfg.dias)
        self.guardar_gravacao(g, f"Campeão da geração {self.geracao} · fase {FASE}", self.geracao)
        log.info("campeão salvo: %s (gravação de %d passos)", modelo_id, len(g["passos"]))

    def primeira_geracao(self, campeao: torch.Tensor) -> None:
        """
        Só exportação, sem mexer na evolução: o campeão da geração 1 (o ponto de
        partida das comparações) e as gravações das regras fixas e de "sem
        controle" no mesmo clima. A prova aqui NÃO conta como melhor prova:
        quais campeões são salvos depois continua igual.
        """
        self.salvar_campeao(campeao, provar(campeao, self.cfg.dias)["vence"])
        for g, titulo in gravar_referencias(self.pasta.name, self.cfg.dias):
            self.guardar_gravacao(g, titulo, None)

    def prova_e_campeao(self, campeao: torch.Tensor) -> None:
        t0 = time.perf_counter()
        r = provar(campeao, self.cfg.dias)
        log.info("prova g%d: campeão R$ %.0f | regras R$ %.0f | nada R$ %.0f | vence em %.0f%% | %.0f g/pé | %.0fs",
                 self.geracao, r["campeao"], r["regras"], r["nada"], 100 * r["vence"], r["massa"], time.perf_counter() - t0)
        if r["campeao"] <= self.melhor_prova:
            return
        self.melhor_prova = r["campeao"]
        if self.geracao > 1:  # o g1 já foi salvo pela primeira_geracao
            self.salvar_campeao(campeao, r["vence"])

    def rodar(self, fim: float, max_geracoes: int | None) -> None:
        cfg = self.cfg
        escrever_json(self.pasta / "config.json", cfg.contrato())
        escrever_json(self.pasta / "normalizacao.json", normalizacao())
        self.salvar_estado(rodando=True)
        log.info("execução %s: P=%d, %d pesos por rede, %d threads, até %s",
                 self.pasta.name, cfg.populacao, n_pesos(), torch.get_num_threads(),
                 datetime.fromtimestamp(fim, FUSO_SP).strftime("%H:%M"))
        campeao = self.pop[:1]
        try:
            while time.time() < fim and (max_geracoes is None or self.geracao < max_geracoes):
                t0 = time.perf_counter()
                numero = self.geracao + 1
                # semente do clima: nunca repete entre gerações nem cai nos climas de prova
                notas, regras = avaliar(self.pop, clima_ameno(cfg.dias, cfg.semente * 100_000 + numero))
                i = int(notas.argmax())
                campeao = self.pop[i:i + 1].clone()
                self.pop = proxima_geracao(self.pop, notas, self.g, cfg.elite, cfg.torneio, cfg.mutacao)
                self.geracao = numero
                seg = time.perf_counter() - t0
                self.geracoes.append({"numero": numero, "fase": FASE, "melhor": round(float(notas.max()), 1),
                                      "mediana": round(float(notas.median()), 1), "regras": round(regras, 1),
                                      "segundos": round(seg, 1)})
                escrever_json(self.pasta / "geracoes.json", self.geracoes)
                self.salvar_estado(rodando=True)
                log.info("g%d: melhor R$ %.0f | mediana R$ %.0f | regras R$ %.0f | %.0fs",
                         numero, notas.max(), notas.median(), regras, seg)
                if numero == 1:
                    self.primeira_geracao(campeao)
                if numero % cfg.prova_cada == 0:
                    self.prova_e_campeao(campeao)
                if numero % cfg.checkpoint_cada == 0:
                    self.salvar_checkpoint()
        except KeyboardInterrupt:
            log.warning("Ctrl+C: salvando antes de sair (geração %d)", self.geracao)
            self.salvar_checkpoint()
            self.salvar_estado(rodando=False)
            raise
        if self.geracao % cfg.prova_cada:  # a última geração ainda não fez prova
            self.prova_e_campeao(campeao)
        self.salvar_checkpoint()
        self.salvar_estado(rodando=False)
        log.info("fim da execução %s na geração %d", self.pasta.name, self.geracao)


class EnvioNuvem:
    """
    Manda a execução atual para o Supabase a cada 15 s, numa THREAD à parte (uma
    segunda linha de execução dentro do mesmo programa): internet lenta ou fora
    do ar nunca atrasa a evolução. Usa o mesmo Sincronizador do treino/nuvem.py
    e, ao trocar de semente, segue a pasta nova sozinho.

    Limite: se o programa inteiro morrer (queda de energia), ninguém marca a
    execução como "parada" na nuvem; o celular fica com a última geração enviada.
    """

    def __init__(self, raiz: Path):
        from treino.nuvem import Config as ConfigNuvem, ErroNuvem, Supabase

        self.nuvem = Supabase(ConfigNuvem.carregar(raiz))
        try:
            self.nuvem.entrar()
            log.info("nuvem: conectado como %s", self.nuvem.cfg.email)
        except (ErroNuvem, OSError) as e:  # sem internet agora: tenta de novo a cada volta
            log.warning("nuvem: não conectou (%s); o treino segue e o envio tenta de novo", e)
        self.sinc = None
        self.trava = threading.Lock()  # uma volta de cada vez
        self.parar = threading.Event()
        self.thread = threading.Thread(target=self._laco, daemon=True)
        self.thread.start()

    def _volta(self) -> None:
        with self.trava:
            if self.sinc is None:
                return
            try:
                feito = self.sinc.uma_volta()
                if feito:
                    log.info("nuvem: %s", "; ".join(feito))
            except Exception as e:  # rede, Supabase fora do ar: a próxima volta tenta de novo
                log.warning("nuvem: envio falhou (%s); tento de novo em 15 s", e)

    def _laco(self) -> None:
        while not self.parar.wait(15):
            self._volta()

    def acompanhar(self, pasta: Path) -> None:
        """Termina de mandar a execução anterior e passa a olhar `pasta`."""
        from treino.nuvem import Sincronizador

        self._volta()
        with self.trava:
            self.sinc = Sincronizador(pasta, self.nuvem)

    def fechar(self) -> None:
        self.parar.set()
        self.thread.join(timeout=60)
        self._volta()  # a última: o estado final ("rodando": false) e o último campeão


def configurar_log(pasta: Path) -> None:
    for h in list(log.handlers):
        log.removeHandler(h)
    log.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(message)s", "%H:%M:%S")
    for h in (logging.FileHandler(pasta / "treino.log", encoding="utf-8"), logging.StreamHandler()):
        h.setFormatter(fmt)
        log.addHandler(h)


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Neuroevolução da fase 1 do Genesis")
    ap.add_argument("--horas", type=float, default=1.0, help="orçamento total, dividido entre as sementes")
    ap.add_argument("--sementes", type=int, default=1, help="quantas sementes em sequência")
    ap.add_argument("--semente", type=int, default=7, help="a primeira semente")
    ap.add_argument("--populacao", type=int, default=Config.populacao)
    ap.add_argument("--mutacao", type=float, default=Config.mutacao)
    ap.add_argument("--dias", type=int, default=Config.dias)
    ap.add_argument("--prova-cada", type=int, default=Config.prova_cada)
    ap.add_argument("--geracoes", type=int, default=None, help="no máximo tantas gerações por semente")
    ap.add_argument("--onde", default=Config.onde, help="a máquina, para o celular mostrar")
    ap.add_argument("--saidas", type=Path, default=Path("treino/saidas"))
    ap.add_argument("--retomar", type=Path, default=None, help="pasta de uma execução com checkpoint.pt")
    ap.add_argument("--nuvem", action="store_true", help="manda cada geração para o Supabase (precisa do .env)")
    a = ap.parse_args(argv)

    envio = None
    try:
        if a.retomar:
            configurar_log(a.retomar)
            envio = EnvioNuvem(Path.cwd()) if a.nuvem else None
            ex = Execucao.retomar(a.retomar)
            log.info("retomando %s da geração %d", a.retomar.name, ex.geracao)
            if envio:
                envio.acompanhar(a.retomar)
            ex.rodar(time.time() + a.horas * 3600, a.geracoes)
            return

        hoje = datetime.now(FUSO_SP).strftime("%Y%m%d")
        fim_total = time.time() + a.horas * 3600
        for k, s in enumerate(range(a.semente, a.semente + a.sementes)):
            pasta = a.saidas / f"fase{FASE}-semente{s}-{hoje}"
            pasta.mkdir(parents=True, exist_ok=True)
            configurar_log(pasta)
            if a.nuvem and envio is None:
                envio = EnvioNuvem(Path.cwd())
            cfg = Config(semente=s, populacao=a.populacao, mutacao=a.mutacao, dias=a.dias,
                         prova_cada=a.prova_cada, onde=a.onde)
            ex = Execucao(pasta, cfg)
            ex.salvar_estado(rodando=True)  # o envio já encontra a execução
            if envio:
                envio.acompanhar(pasta)
            # o tempo que sobra, dividido pelas sementes que faltam: uma semente
            # que acabe mais cedo (ou atrase) não rouba nem dá tempo às outras
            ex.rodar(time.time() + (fim_total - time.time()) / (a.sementes - k), a.geracoes)
    finally:
        if envio:
            envio.fechar()


if __name__ == "__main__":
    main()
