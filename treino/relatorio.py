"""
O relatório da manhã: como foi o treino de uma execução.

    .venv\\Scripts\\python.exe -m treino.relatorio treino/saidas/<execucao>

Gera, dentro da pasta da execução:
  curva.png     melhor, mediana e regras fixas por geração;
  relatorio.md  o campeão contra as regras e contra "não fazer nada" em 10
                climas que nem o treino nem a prova viram.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # desenha direto em arquivo, sem abrir janela
import matplotlib.pyplot as plt
import torch

from controle.ciclo import simular_ciclo
from controle.controladores import PID, Nada, RegrasFixas
from simulador.clima import clima_ameno, empilhar
from simulador.estufa import Estufa
from treino.evolucao import Combinado
from treino.rede import ControladorRede

SEMENTES_INEDITAS = tuple(range(20_000, 20_010))


def curva(pasta: Path, geracoes: list[dict]) -> Path:
    n = [g["numero"] for g in geracoes]
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.plot(n, [g["melhor"] for g in geracoes], label="melhor rede", color="#4B9CF2", lw=2)
    ax.plot(n, [g["mediana"] for g in geracoes], label="rede mediana", color="#8B6FF0", lw=1.2)
    ax.plot(n, [g["regras"] for g in geracoes], label="regras fixas (mesmo clima)", color="#8E8E93", ls="--")
    ax.set_xlabel("geração")
    ax.set_ylabel("nota (R$ por ciclo)")
    ax.set_title(f"{pasta.name}: cada geração tem um clima novo, por isso a curva balança")
    # a mediana começa muito negativa e esconderia o resto: corta o eixo embaixo
    ax.set_ylim(bottom=min(min(g["regras"] for g in geracoes), max(g["melhor"] for g in geracoes)) - 1500)
    ax.grid(alpha=0.3)
    ax.legend()
    fig.tight_layout()
    arq = pasta / "curva.png"
    fig.savefig(arq, dpi=120)
    plt.close(fig)
    return arq


def comparar(modelo: dict, dias: int) -> dict[str, list[float]]:
    """Campeão, regras, PID e nada nos climas inéditos: uma simulação só."""
    k = len(SEMENTES_INEDITAS)
    pesos = torch.tensor(modelo["pesos"]).reshape(1, -1).expand(k, -1)
    climas = [clima_ameno(dias, s) for s in SEMENTES_INEDITAS]
    e = Estufa(4 * k, empilhar(climas * 4))
    ctrl = Combinado((ControladorRede(pesos), k), (RegrasFixas(), k), (PID(), k), (Nada(), k))
    m = simular_ciclo(e, ctrl)
    notas, massa = m.nota(e.massa_por_pe), e.massa_por_pe
    nomes = ("campeão", "regras fixas", "PID", "não fazer nada")
    return {
        nome: {
            "nota": notas[i * k:(i + 1) * k].tolist(),
            "massa": massa[i * k:(i + 1) * k].tolist(),
            "energia": m.energia_kwh[i * k:(i + 1) * k].tolist(),
            "fora": (m.fora_qualquer[i * k:(i + 1) * k] / m.passos).tolist(),
        }
        for i, nome in enumerate(nomes)
    }


def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        sys.exit("Uso: python -m treino.relatorio treino/saidas/<execucao>")
    pasta = Path(argv[0])
    geracoes = json.loads((pasta / "geracoes.json").read_text(encoding="utf-8"))
    modelos = sorted((pasta / "modelos").glob("*.json"), key=lambda a: json.loads(a.read_text(encoding="utf-8"))["geracao"])
    modelo = json.loads(modelos[-1].read_text(encoding="utf-8"))  # o último campeão salvo é o melhor na prova
    config = json.loads((pasta / "config.json").read_text(encoding="utf-8"))
    # os dias do ciclo: a gravação tem um passo a cada 10 min (144 por dia)
    indice = json.loads((pasta / "gravacoes" / "indice.json").read_text(encoding="utf-8"))
    dias = max(1, indice[-1]["passos"] // 144)
    png = curva(pasta, geracoes)
    r = comparar(modelo, dias)

    media = lambda xs: sum(xs) / len(xs)
    linhas = [
        f"# Relatório: {pasta.name}",
        "",
        f"- Gerações: {len(geracoes)} · população {config['populacao']} · mutação {config['mutacao']}",
        f"- Campeão: `{modelo['id']}` (geração {modelo['geracao']}), "
        f"venceu as regras em {modelo['provaPorFase']['1']:.0%} dos climas de prova",
        f"- Curva: `{png.name}`",
        "",
        f"## Em {len(SEMENTES_INEDITAS)} climas que o treino e a prova nunca viram (média)",
        "",
        "| Controlador | Nota (R$) | Massa por pé (g) | Energia (kWh) | Tempo fora da faixa |",
        "| --- | --- | --- | --- | --- |",
    ]
    for nome, v in r.items():
        linhas.append(f"| {nome} | {media(v['nota']):,.0f} | {media(v['massa']):.0f} | {media(v['energia']):.0f} | {media(v['fora']):.0%} |")
    vence = sum(c > g for c, g in zip(r["campeão"]["nota"], r["regras fixas"]["nota"]))
    linhas += ["", f"O campeão venceu as regras fixas em {vence} de {len(SEMENTES_INEDITAS)} climas inéditos.", ""]
    texto = "\n".join(linhas).replace(",", ".")
    (pasta / "relatorio.md").write_text(texto, encoding="utf-8")
    print(texto)
    print(f"Arquivos em {pasta.resolve()}")


if __name__ == "__main__":
    main()
