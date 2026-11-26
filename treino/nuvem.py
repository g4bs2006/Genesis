"""
Manda o treino para a nuvem (Supabase), para acompanhar pelo celular.

Como funciona, em uma frase: este programa fica olhando a pasta que o treino
escreve (treino/saidas/<execucao>/) e, a cada poucos segundos, envia ao Supabase
só o que mudou. O dashboard no Vercel lê de lá e atualiza sozinho.

    PC do treino ──> treino/saidas/<execucao>/*.json ──> ESTE ARQUIVO ──> Supabase ──> celular

Por que separado do treino, e não dentro dele:
  - se a internet cair, o treino não para nem fica lento: só este programa
    espera e tenta de novo;
  - o treino continua só escrevendo arquivos (o contrato, docs/contrato-dados.md),
    e dá para mandar de novo uma execução antiga quando quiser.

Uso (na raiz do repositório, com o .env preenchido; ver docs/nuvem.md):

    python -m treino.nuvem treino/saidas/fase1-semente7      # fica olhando até Ctrl+C
    python -m treino.nuvem treino/saidas/fase1-semente7 --uma-vez
    python -m treino.nuvem --demo                            # treino de mentira, para testar o celular
    python -m treino.nuvem --apagar demo-20261124-2300       # apaga uma execução da nuvem

Só usa a biblioteca padrão do Python (urllib, json): nada para instalar.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

BUCKET = "genesis-gravacoes"
SCHEMA = "genesis"
# São Paulo não tem horário de verão desde 2019: sempre -03:00 (o contrato pede esse fuso)
FUSO_SP = timezone(timedelta(hours=-3))
# Quantas gerações por pedido. O PostgREST aceita bem mais, mas pedidos menores
# falham menos em internet ruim.
LOTE_GERACOES = 500


# ---------------------------------------------------------------------------
# Configuração: o .env
# ---------------------------------------------------------------------------


def ler_env(caminho: Path) -> dict[str, str]:
    """
    Lê um arquivo .env (linhas NOME=valor). É onde ficam o endereço do Supabase e
    a senha da conta do treino. O .env NUNCA vai para o Git (está no .gitignore):
    a senha fica só no PC do treino.
    """
    valores: dict[str, str] = {}
    if not caminho.exists():
        return valores
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        nome, valor = linha.split("=", 1)
        valores[nome.strip()] = valor.strip().strip('"').strip("'")
    return valores


@dataclass
class Config:
    url: str
    chave: str  # a chave "publishable": pública, quem protege é a RLS
    email: str
    senha: str

    @staticmethod
    def carregar(raiz: Path) -> "Config":
        env = {**ler_env(raiz / ".env"), **os.environ}  # variável de ambiente ganha do arquivo
        faltando = [
            n
            for n in ("GENESIS_SUPABASE_URL", "GENESIS_SUPABASE_CHAVE", "GENESIS_TREINO_EMAIL", "GENESIS_TREINO_SENHA")
            if not env.get(n)
        ]
        if faltando:
            sys.exit(
                f"Faltam no .env: {', '.join(faltando)}.\n"
                f"Copie .env.exemplo para .env na raiz do repositório e preencha (docs/nuvem.md)."
            )
        return Config(
            url=env["GENESIS_SUPABASE_URL"].rstrip("/"),
            chave=env["GENESIS_SUPABASE_CHAVE"],
            email=env["GENESIS_TREINO_EMAIL"],
            senha=env["GENESIS_TREINO_SENHA"],
        )


# ---------------------------------------------------------------------------
# Conversa com o Supabase (HTTP puro)
# ---------------------------------------------------------------------------


class ErroNuvem(Exception):
    pass


class Supabase:
    """
    O mínimo do Supabase que o treino precisa, falando HTTP direto:
      - /auth/v1     entrar com a conta do treino e renovar o "token"
      - /rest/v1     gravar nas tabelas (o PostgREST transforma HTTP em SQL)
      - /storage/v1  enviar os arquivos das gravações

    Token (JWT) = um "crachá" assinado que o Supabase entrega no login. Vale ~1 h;
    cada pedido leva o crachá, e é por ele que a RLS sabe que somos o treino.
    """

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.token: str | None = None
        self.renovar_token: str | None = None
        self.expira_em = 0.0

    # -- HTTP ---------------------------------------------------------------

    def _pedir(self, metodo: str, caminho: str, corpo: bytes | None = None, cabecalhos: dict | None = None):
        cab = {"apikey": self.cfg.chave, **(cabecalhos or {})}
        pedido = urllib.request.Request(self.cfg.url + caminho, data=corpo, method=metodo, headers=cab)
        try:
            with urllib.request.urlopen(pedido, timeout=30) as resposta:
                texto = resposta.read().decode("utf-8")
                return json.loads(texto) if texto else None
        except urllib.error.HTTPError as erro:
            detalhe = erro.read().decode("utf-8", "replace")[:500]
            raise ErroNuvem(f"{metodo} {caminho} -> HTTP {erro.code}: {detalhe}") from None
        except urllib.error.URLError as erro:
            raise ErroNuvem(f"{metodo} {caminho} -> sem conexão ({erro.reason})") from None

    def _json(self, metodo: str, caminho: str, dados, cabecalhos: dict | None = None):
        return self._pedir(
            metodo,
            caminho,
            json.dumps(dados, ensure_ascii=False).encode("utf-8"),
            {"Content-Type": "application/json", **(cabecalhos or {})},
        )

    # -- login --------------------------------------------------------------

    def entrar(self) -> None:
        """Pede o crachá com e-mail e senha; depois só renova."""
        if self.renovar_token:
            try:
                r = self._json("POST", "/auth/v1/token?grant_type=refresh_token", {"refresh_token": self.renovar_token})
                self._guardar(r)
                return
            except ErroNuvem:
                pass  # o de renovar venceu: entra de novo com a senha
        r = self._json("POST", "/auth/v1/token?grant_type=password", {"email": self.cfg.email, "password": self.cfg.senha})
        self._guardar(r)
        papel = (r.get("user") or {}).get("app_metadata", {}).get("genesis_escritor")
        if not papel:
            raise ErroNuvem(
                f"A conta {self.cfg.email} entrou, mas não tem permissão de escrever no Gênesis "
                "(falta app_metadata.genesis_escritor = true; ver docs/nuvem.md)."
            )

    def _guardar(self, r: dict) -> None:
        self.token = r["access_token"]
        self.renovar_token = r["refresh_token"]
        # renova 5 min antes de vencer, para nunca mandar um crachá vencido
        self.expira_em = time.time() + int(r.get("expires_in", 3600)) - 300

    def _autorizado(self) -> dict:
        if not self.token or time.time() > self.expira_em:
            self.entrar()
        return {"Authorization": f"Bearer {self.token}"}

    # -- tabelas e arquivos -------------------------------------------------

    def gravar(self, tabela: str, linhas: list[dict] | dict, chave: str) -> None:
        """
        "Upsert" = insere, ou atualiza se já existe (mesma chave). Assim, mandar
        a mesma coisa duas vezes não duplica nada: dá para reiniciar à vontade.
        """
        self._json(
            "POST",
            f"/rest/v1/{tabela}?on_conflict={chave}",
            linhas,
            {
                **self._autorizado(),
                "Content-Profile": SCHEMA,  # o schema "genesis", não o "public"
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
        )

    def apagar_execucao(self, execucao_id: str) -> None:
        # as gerações, modelos e gravações vão junto (on delete cascade no banco)
        self._pedir(
            "DELETE",
            f"/rest/v1/execucoes?id=eq.{urllib.parse.quote(execucao_id)}",
            None,
            {**self._autorizado(), "Content-Profile": SCHEMA, "Prefer": "return=minimal"},
        )
        # e os arquivos das gravações, que moram no Storage
        arquivos = self._json(
            "POST", f"/storage/v1/object/list/{BUCKET}", {"prefix": execucao_id, "limit": 1000}, self._autorizado()
        )
        nomes = [f"{execucao_id}/{a['name']}" for a in arquivos or []]
        if nomes:
            self._json("DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": nomes}, self._autorizado())

    def enviar_arquivo(self, caminho_no_bucket: str, conteudo: bytes, cache_s: int = 3600) -> None:
        """cache_s: quanto tempo a CDN do Supabase pode guardar a cópia (o índice muda; a gravação quase nunca)."""
        self._pedir(
            "POST",
            f"/storage/v1/object/{BUCKET}/{urllib.parse.quote(caminho_no_bucket)}",
            conteudo,
            {**self._autorizado(), "Content-Type": "application/json", "x-upsert": "true",
             "cache-control": f"max-age={cache_s}"},
        )


# ---------------------------------------------------------------------------
# O que mudou na pasta
# ---------------------------------------------------------------------------


def ler_json(caminho: Path):
    """
    Lê um JSON que o treino pode estar escrevendo neste exato instante. Se pegar
    o arquivo pela metade, o json reclama: devolvemos None e tentamos na próxima
    volta. (O treino pode evitar isso escrevendo num .tmp e renomeando.)
    """
    try:
        return json.loads(caminho.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def agora_sp() -> str:
    return datetime.now(FUSO_SP).replace(microsecond=0).isoformat()


@dataclass
class Sincronizador:
    """
    Guarda o que já foi enviado (data de modificação de cada arquivo e a última
    geração) para mandar só o que é novo.
    """

    pasta: Path
    nuvem: Supabase
    parado_apos_s: float = 15 * 60
    enviados: dict[str, float] = field(default_factory=dict)
    ultima_geracao: int = -1
    marcado_parado: bool = False
    # a pasta do treino manda "indice.json"; a da reavaliação (treino/reavaliar.py),
    # "indice-reavaliacao.json": uma nunca apaga o que a outra mandou
    indice_na_nuvem: str = "indice.json"

    @property
    def execucao_id(self) -> str:
        return self.pasta.name

    def _mudou(self, arquivo: Path) -> bool:
        try:
            mtime = arquivo.stat().st_mtime
        except FileNotFoundError:
            return False
        return self.enviados.get(str(arquivo)) != mtime

    def _marcar(self, arquivo: Path) -> None:
        self.enviados[str(arquivo)] = arquivo.stat().st_mtime

    def uma_volta(self) -> list[str]:
        """Uma passada pela pasta. Devolve o que foi enviado, para o log."""
        feito: list[str] = []
        p = self.pasta
        estado_arq, config_arq, norm_arq = p / "estado.json", p / "config.json", p / "normalizacao.json"

        # 1. A execução (tem de vir primeiro: as outras tabelas apontam para ela)
        if any(self._mudou(a) for a in (estado_arq, config_arq, norm_arq)) or self._precisa_marcar_parado(estado_arq):
            estado, config = ler_json(estado_arq), ler_json(config_arq)
            if estado is None or config is None:
                return feito  # o treino ainda não escreveu o começo: espera
            parado = self._precisa_marcar_parado(estado_arq)
            if parado:
                # O estado.json parou de mudar mas diz "rodando": o treino
                # provavelmente morreu (queda de energia, erro). Avisamos o celular.
                estado = {**estado, "rodando": False}
            linha = {"id": self.execucao_id, "estado": estado, "configuracao": config}
            norm = ler_json(norm_arq)
            if norm is not None:
                linha["normalizacao"] = norm
            self.nuvem.gravar("execucoes", linha, "id")
            for a in (estado_arq, config_arq, norm_arq):
                if a.exists():
                    self._marcar(a)
            self.marcado_parado = parado
            feito.append(f"estado (fase {estado.get('faseAtual')}, geração {estado.get('geracaoAtual')})"
                         + (" · sem notícias do treino: marcado como parado" if parado else ""))

        # 2. Gerações: só as novas, em lotes
        ger_arq = p / "geracoes.json"
        if self._mudou(ger_arq):
            geracoes = ler_json(ger_arq)
            if isinstance(geracoes, list):
                novas = [g for g in geracoes if g["numero"] > self.ultima_geracao]
                for i in range(0, len(novas), LOTE_GERACOES):
                    lote = novas[i : i + LOTE_GERACOES]
                    self.nuvem.gravar(
                        "geracoes",
                        [linha_geracao(self.execucao_id, g) for g in lote],
                        "execucao_id,numero",
                    )
                    self.ultima_geracao = lote[-1]["numero"]
                self._marcar(ger_arq)
                if novas:
                    feito.append(f"{len(novas)} gerações (até a {self.ultima_geracao})")

        # 3. Modelos: cada campeão novo
        for arq in sorted((p / "modelos").glob("*.json")):
            if self._mudou(arq):
                m = ler_json(arq)
                if m is None:
                    continue
                self.nuvem.gravar(
                    "modelos",
                    {"execucao_id": self.execucao_id, "id": m["id"], "geracao": m["geracao"], "fase": m["fase"], "dados": m},
                    "execucao_id,id",
                )
                self._marcar(arq)
                feito.append(f"modelo {m['id']}")

        # 4. Gravações: primeiro o arquivo (Storage), depois a linha que aponta para ele
        indice_arq = p / "gravacoes" / "indice.json"
        indice = ler_json(indice_arq) if indice_arq.exists() else None
        for resumo in indice or []:
            arq = p / "gravacoes" / f"{resumo['id']}.json"
            if not self._mudou(arq):
                continue
            if resumo["id"] in self._reavaliadas():
                # A reavaliação (treino/reavaliar.py) já mandou esta gravação com a
                # massa e o resumo; a versão antiga desta pasta não pode apagá-la.
                self._marcar(arq)
                feito.append(f"gravação {resumo['id']} pulada (a reavaliação mandou uma versão mais completa)")
                continue
            no_bucket = f"{self.execucao_id}/{resumo['id']}.json"
            self.nuvem.enviar_arquivo(no_bucket, arq.read_bytes())
            self.nuvem.gravar("gravacoes", linha_gravacao(self.execucao_id, resumo, no_bucket), "execucao_id,id")
            self._marcar(arq)
            feito.append(f"gravação {resumo['id']} ({arq.stat().st_size // 1024} KB)")

        # 5. O índice inteiro, no Storage: leva o que a tabela não tem coluna para
        # guardar (controlador, geração e o resumo do ciclo, passo 09). Pequeno
        # (poucos KB) e com cache curto, porque muda a cada campeão novo.
        if indice is not None and self._mudou(indice_arq):
            self.nuvem.enviar_arquivo(f"{self.execucao_id}/{self.indice_na_nuvem}",
                                      json.dumps(indice, ensure_ascii=False).encode("utf-8"), cache_s=60)
            self._marcar(indice_arq)
            feito.append(f"índice ({len(indice)} gravações)")
        return feito

    def _reavaliadas(self) -> set[str]:
        """
        Ids que treino/reavaliacoes/<execucao>/ já tem (vazio na própria pasta da
        reavaliação). treino/saidas/<execucao> -> treino/reavaliacoes/<execucao>.
        """
        if self.indice_na_nuvem != "indice.json":
            return set()
        outra = ler_json(self.pasta.parent.parent / "reavaliacoes" / self.pasta.name / "gravacoes" / "indice.json")
        return {r["id"] for r in outra or []}

    def _precisa_marcar_parado(self, estado_arq: Path) -> bool:
        if not estado_arq.exists():
            return False
        quieto = time.time() - estado_arq.stat().st_mtime > self.parado_apos_s
        if not quieto or self.marcado_parado:
            return False
        estado = ler_json(estado_arq) or {}
        return bool(estado.get("rodando"))


def linha_geracao(execucao_id: str, g: dict) -> dict:
    """Geracao do contrato (camelCase) -> linha da tabela (as colunas têm os mesmos nomes)."""
    return {
        "execucao_id": execucao_id,
        "numero": g["numero"],
        "fase": g["fase"],
        "melhor": g["melhor"],
        "mediana": g["mediana"],
        "regras": g["regras"],
        "segundos": g["segundos"],
    }


def linha_gravacao(execucao_id: str, r: dict, arquivo: str) -> dict:
    """
    ResumoGravacao do contrato (camelCase) -> linha da tabela (snake_case).
    Os campos do passo 09 (controlador, geracao, resumo) não têm coluna: vão no
    índice da pasta, enviado ao Storage (ver Sincronizador.uma_volta).
    """
    return {
        "execucao_id": execucao_id,
        "id": r["id"],
        "semente": r["semente"],
        "modelo_id": r["modeloId"],
        "titulo": r["titulo"],
        "criada_em": r["criadaEm"],
        "passos": r["passos"],
        "arquivo": arquivo,
    }


# ---------------------------------------------------------------------------
# Modo demo: um treino de mentira, para ver o celular mexer antes do real
# ---------------------------------------------------------------------------


def escrever_json(caminho: Path, dados) -> None:
    """Escreve num .tmp e renomeia: quem lê nunca pega o arquivo pela metade."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    tmp = caminho.with_suffix(".tmp")
    tmp.write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, caminho)


def passo_demo(pasta: Path, n: int, inicio: str, geracoes: list[dict]) -> None:
    """Escreve a geração n de um treino falso: uma curva que sobe e se aproxima das regras."""
    melhor = 120 - 250 * math.exp(-n / 40) + random.gauss(0, 4)
    geracoes.append(
        {
            "numero": n,
            "fase": 1,
            "melhor": round(melhor, 1),
            "mediana": round(melhor - 60 - random.random() * 20, 1),
            "regras": round(85 + random.gauss(0, 3), 1),
            "segundos": round(2 + random.random(), 1),
        }
    )
    escrever_json(pasta / "geracoes.json", geracoes)
    escrever_json(
        pasta / "estado.json",
        {
            "rodando": True,
            "onde": "demo · treino de mentira (treino/nuvem.py --demo)",
            "faseAtual": 1,
            "geracaoAtual": n,
            "iniciadoEm": inicio,
            "criterioPassagem": "< 5% fora da faixa e nota > regras",
            "inicioPorFase": {"1": 1},
        },
    )


def rodar_demo(nuvem: Supabase, intervalo: float) -> None:
    random.seed(7)
    pasta = Path(tempfile.mkdtemp(prefix="genesis-demo-")) / datetime.now(FUSO_SP).strftime("demo-%Y%m%d-%H%M")
    inicio = agora_sp()
    escrever_json(
        pasta / "config.json",
        {"populacao": 512, "elite": 0.05, "torneio": 3, "mutacao": 0.03, "misturaFases": 0,
         "arquitetura": [20, 32, 32, 8], "passoMinutos": 10},
    )
    print(f"Demo: execução {pasta.name}. Abra o dashboard no celular (Desenvolvedor › Treino).")
    print("Uma geração nova a cada 3 s. Ctrl+C para parar; depois apague com:")
    print(f"  python -m treino.nuvem --apagar {pasta.name}\n")
    sinc = Sincronizador(pasta, nuvem)
    geracoes: list[dict] = []
    n, ultimo_envio = 0, 0.0
    try:
        while True:
            n += 1
            passo_demo(pasta, n, inicio, geracoes)
            if time.time() - ultimo_envio >= intervalo:
                relatar(sinc.uma_volta())
                ultimo_envio = time.time()
            time.sleep(3)
    except KeyboardInterrupt:
        estado = ler_json(pasta / "estado.json")
        escrever_json(pasta / "estado.json", {**estado, "rodando": False})
        relatar(sinc.uma_volta())
        print("\nDemo parada (o celular mostra 'parado').")


# ---------------------------------------------------------------------------
# Programa
# ---------------------------------------------------------------------------


def relatar(feito: list[str]) -> None:
    if feito:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] enviado: " + "; ".join(feito), flush=True)


def vigiar(sinc: Sincronizador, intervalo: float, uma_vez: bool) -> None:
    espera = intervalo
    while True:
        try:
            relatar(sinc.uma_volta())
            espera = intervalo
        except ErroNuvem as erro:
            # Internet caiu ou o Supabase recusou: avisa e tenta de novo depois,
            # esperando cada vez mais (até 5 min) para não insistir à toa.
            print(f"[{datetime.now().strftime('%H:%M:%S')}] falhou, tento de novo em {espera:.0f} s: {erro}", flush=True)
            if uma_vez:
                sys.exit(1)
            time.sleep(espera)
            espera = min(espera * 2, 300)
            continue
        if uma_vez:
            return
        time.sleep(intervalo)


def main(argv: list[str] | None = None) -> None:
    raiz = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(prog="python -m treino.nuvem", description=__doc__.split("\n\n")[1])
    ap.add_argument("pasta", nargs="?", type=Path, help="a pasta da execução, ex.: treino/saidas/fase1-semente7")
    ap.add_argument("--intervalo", type=float, default=15, help="segundos entre uma olhada e outra (padrão 15)")
    ap.add_argument("--uma-vez", action="store_true", help="envia o que tem e sai")
    ap.add_argument("--parado-apos", type=float, default=15, help="minutos sem mudar o estado.json para marcar 'parado'")
    ap.add_argument("--demo", action="store_true", help="treino de mentira, para testar o celular")
    ap.add_argument("--apagar", metavar="EXECUCAO", help="apaga uma execução da nuvem (tabelas e gravações)")
    args = ap.parse_args(argv)

    nuvem = Supabase(Config.carregar(raiz))
    nuvem.entrar()
    print(f"Conectado ao Supabase como {nuvem.cfg.email}.")

    if args.apagar:
        nuvem.apagar_execucao(args.apagar)
        print(f"Execução {args.apagar} apagada da nuvem.")
    elif args.demo:
        rodar_demo(nuvem, args.intervalo)
    elif args.pasta:
        if not args.pasta.is_dir():
            sys.exit(f"Pasta não encontrada: {args.pasta}")
        reavaliacao = not (args.pasta / "estado.json").exists()  # treino/reavaliacoes/<execucao>
        sinc = Sincronizador(args.pasta.resolve(), nuvem, parado_apos_s=args.parado_apos * 60,
                             indice_na_nuvem="indice-reavaliacao.json" if reavaliacao else "indice.json")
        print(f"Olhando {args.pasta} a cada {args.intervalo:.0f} s (Ctrl+C para parar)...")
        try:
            vigiar(sinc, args.intervalo, args.uma_vez)
        except KeyboardInterrupt:
            print("\nParado. O que já foi enviado continua na nuvem.")
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
