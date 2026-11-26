"""
Reavaliar uma execução já treinada, SEM retreinar (passo 09).

    .venv\\Scripts\\python.exe -m treino.reavaliar treino/saidas/<execucao>
    .venv\\Scripts\\python.exe -m treino.nuvem --uma-vez treino/reavaliacoes/<execucao>

As execuções da noite de 24/11 foram gravadas antes de o treino exportar as
regras fixas, "sem controle", a massa por dia e o resumo de cada gravação.
Este script faz isso para os campeões que JÁ existem, no mesmo clima da
gravação (SEMENTE_GRAVACAO):

  1. o campeão da geração 1, refeito: a população inicial sai da mesma semente
     (pesos_iniciais com o gerador do treino) e é avaliada no clima da geração 1.
     Confere que a melhor nota e a das regras batem com geracoes.json; se não
     baterem, para (seria um número inventado);
  2. cada campeão de modelos/: a gravação de novo, agora com massa e resumo.
     Confere os passos contra a gravação original (ver TOLERANCIA);
  3. as regras fixas e "sem controle", no mesmo clima.

Nada em treino/saidas/ é apagado nem sobrescrito: tudo vai para
treino/reavaliacoes/<execucao>/ (modelos/, gravacoes/ e gravacoes/indice.json),
no mesmo formato que o treino exporta. O nome da pasta é o da execução, então o
treino/nuvem.py manda tudo para a mesma execução na nuvem.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch

from simulador.clima import clima_ameno
from treino.nuvem import escrever_json, ler_json
from treino.rede import ControladorRede, pesos_iniciais
from treino.treinar import (
    FASE,
    avaliar,
    gravar,
    gravar_referencias,
    modelo_contrato,
    provar,
    resumo_gravacao,
)


class Divergencia(Exception):
    """O que foi refeito não bate com o que o treino gravou: não dá para confiar."""


def campeao_g1(pasta: Path) -> tuple[torch.Tensor, dict]:
    """Refaz a população inicial e devolve (pesos do campeão da geração 1, a conferência)."""
    # weights_only: só números e textos; um checkpoint adulterado não roda código
    cfg = torch.load(pasta / "checkpoint.pt", weights_only=True)["cfg"]
    geracoes = json.loads((pasta / "geracoes.json").read_text(encoding="utf-8"))
    g1 = next(g for g in geracoes if g["numero"] == 1)
    # Igual ao Execucao.__init__ + a 1ª volta do rodar(): mesmo gerador, mesmo clima
    gerador = torch.Generator().manual_seed(cfg["semente"])
    pop = pesos_iniciais(cfg["populacao"], gerador)
    notas, regras = avaliar(pop, clima_ameno(cfg["dias"], cfg["semente"] * 100_000 + 1))
    conferencia = {"melhor": round(float(notas.max()), 1), "regras": round(regras, 1),
                   "esperado": {"melhor": g1["melhor"], "regras": g1["regras"]}}
    if conferencia["melhor"] != g1["melhor"] or conferencia["regras"] != g1["regras"]:
        raise Divergencia(f"geração 1 refeita não bate com geracoes.json: {conferencia}")
    i = int(notas.argmax())
    return pop[i:i + 1].clone(), cfg | conferencia


# Os modelos/*.json guardam os pesos com 6 casas; a gravação original usou os
# pesos exatos da memória. Essa diferença (< 1e-6 por peso) muda a 3ª casa de
# uma ação de vez em quando, e a estufa anda um tiquinho diferente. Medido na
# semente 8, g125: no máximo 0,054 µmol/m²/s de luz e 0,003 numa ação, em 778
# dos 5040 passos. A tolerância é absoluta, nas unidades dos sensores: 0,5 é
# menos de 0,1% da escala da luz e do CO₂ (centenas). Uma mudança de verdade
# (outro modelo, outro simulador) afasta a estufa em unidades inteiras.
TOLERANCIA = 0.5


def diferenca_maxima(a, b) -> float:
    """A maior diferença entre dois JSON de mesmo formato (números); inf se o formato ou um texto difere."""
    if isinstance(a, bool) or isinstance(b, bool) or isinstance(a, str):
        return 0.0 if a == b else float("inf")
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b)
    if isinstance(a, dict) and isinstance(b, dict) and a.keys() == b.keys():
        return max((diferenca_maxima(a[k], b[k]) for k in a), default=0.0)
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        return max((diferenca_maxima(x, y) for x, y in zip(a, b)), default=0.0)
    return float("inf")


def conferir_passos(nova: dict, original: Path) -> float | None:
    """A maior diferença entre os passos refeitos e os originais (None se não há original)."""
    antiga = ler_json(original)
    if antiga is None:
        return None
    d = diferenca_maxima(antiga["passos"], nova["passos"])
    if d > TOLERANCIA:
        raise Divergencia(f"{nova['id']}: os passos refeitos diferem da gravação original (até {d})")
    return d


def reavaliar(pasta: Path, saida: Path) -> dict:
    execucao = pasta.name
    pesos_g1, cfg = campeao_g1(pasta)
    dias = cfg["dias"]
    print(f"{execucao}: geração 1 refeita, melhor R$ {cfg['melhor']} e regras R$ {cfg['regras']} (batem com geracoes.json)")

    # os campeões: g1 refeito + os salvos pelo treino, em ordem de geração
    campeoes = [(1, f"{execucao}-g1", pesos_g1, provar(pesos_g1, dias)["vence"])]
    for arq in (pasta / "modelos").glob("*.json"):
        m = json.loads(arq.read_text(encoding="utf-8"))
        if m["geracao"] == 1:  # um treino novo já salva o g1; o refeito tem os pesos exatos
            continue
        campeoes.append((m["geracao"], m["id"], torch.tensor([m["pesos"]]), m["provaPorFase"][str(FASE)]))
    campeoes.sort(key=lambda c: c[0])

    indice, conferidas, maior_diferenca = [], 0, 0.0
    criadas = {r["id"]: r["criadaEm"] for r in ler_json(pasta / "gravacoes" / "indice.json") or []}
    for geracao, modelo_id, pesos, vence in campeoes:
        if geracao == 1:  # só o g1 é modelo novo; os outros já estão na nuvem
            escrever_json(saida / "modelos" / f"{modelo_id}.json", modelo_contrato(modelo_id, 1, pesos, vence))
        g = gravar(ControladorRede(pesos), f"{modelo_id}-gravacao", modelo_id, dias)
        d = conferir_passos(g, pasta / "gravacoes" / f"{g['id']}.json")
        if d is not None:
            conferidas += 1
            maior_diferenca = max(maior_diferenca, d)
        escrever_json(saida / "gravacoes" / f"{g['id']}.json", g)
        resumo = resumo_gravacao(g, f"Campeão da geração {geracao} · fase {FASE}", geracao)
        # a data de quando o treino gravou continua a mesma (a reavaliação não é um campeão novo)
        resumo["criadaEm"] = criadas.get(g["id"], resumo["criadaEm"])
        indice.append(resumo)
        r = g["resumo"]
        print(f"  g{geracao}: {r['massaPorPe']} g/pé, {r['energiaKwh']} kWh, "
              f"{100 * r['foraDaFaixa']:.1f}% fora da faixa, nota R$ {r['nota']}")

    for g, titulo in gravar_referencias(execucao, dias):
        escrever_json(saida / "gravacoes" / f"{g['id']}.json", g)
        indice.append(resumo_gravacao(g, titulo, None))
        r = g["resumo"]
        print(f"  {titulo}: {r['massaPorPe']} g/pé, {r['energiaKwh']} kWh, "
              f"{100 * r['foraDaFaixa']:.1f}% fora da faixa, nota R$ {r['nota']}")

    escrever_json(saida / "gravacoes" / "indice.json", indice)
    print(f"  {conferidas} gravações conferidas passo a passo com as originais "
          f"(maior diferença {maior_diferenca:g}); saída em {saida}")
    return {"execucao": execucao, "conferidas": conferidas, "maior_diferenca": maior_diferenca, "g1": cfg,
            "indice": indice}


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Reavalia os campeões salvos de uma execução, sem retreinar")
    ap.add_argument("pastas", nargs="+", type=Path, help="treino/saidas/<execucao> (uma ou mais)")
    ap.add_argument("--saida", type=Path, default=Path("treino/reavaliacoes"))
    a = ap.parse_args(argv)
    for pasta in a.pastas:
        reavaliar(pasta, a.saida / pasta.name)


if __name__ == "__main__":
    main()
