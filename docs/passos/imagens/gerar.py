"""
Gera os gráficos das páginas de docs/passos/. Rode na raiz do repositório:

    .venv\\Scripts\\python.exe docs/passos/imagens/gerar.py

Os números vêm das medições feitas em cada passo (a página de cada passo diz
como refazer a medição). Ficam aqui escritos para o gráfico não depender de
rodar a simulação de novo.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

AQUI = Path(__file__).parent
AZUL, LARANJA, VERDE, ROXO, CINZA, VERMELHO = "#4B9CF2", "#EE8B45", "#45B866", "#8B6FF0", "#8E8E93", "#E5534B"
plt.rcParams.update({"font.size": 11, "axes.spines.top": False, "axes.spines.right": False})


def salvar(fig, nome):
    fig.tight_layout()
    fig.savefig(AQUI / nome, dpi=130)
    plt.close(fig)
    print("gerado", nome)


# --- Passo 02: calibração do c_alfa_beta --------------------------------------
# 41 estufas em paralelo, cada uma com um c_alfa_beta; média de 3 climas amenos
# (sementes 1, 2, 3), termostato simples (exaustor acima de 22 °C), dia 30.
calibracao = [
    (0.2516, 182.2), (0.2602, 189.6), (0.2688, 197.0), (0.2774, 204.5), (0.2860, 211.9),
    (0.2946, 219.3), (0.3032, 226.7), (0.3118, 234.0), (0.3204, 241.4), (0.3290, 248.8),
    (0.3376, 256.2), (0.3462, 263.6), (0.3548, 271.0), (0.3634, 278.3), (0.3720, 285.7),
    (0.3806, 293.1),
]
fig, ax = plt.subplots(figsize=(9, 4.2))
ax.axhspan(209, 250, color=VERDE, alpha=0.15, label="referência: 209 a 250 g (Santos et al. 2023)")
ax.plot(*zip(*calibracao), "o-", color=AZUL, ms=4, label="simulador, dia 30")
ax.plot([0.3806, 0.544], [293.1, 433.2], ":", color=AZUL)
ax.plot([0.544], [433.2], "o", color=VERMELHO, ms=8, label="Van Henten original (0,544): 433 g")
ax.plot([0.307], [230], "*", color=VERDE, ms=16, mec="black", label="escolhido (0,307): ~230 g")
ax.set_xlabel("c_alfa_beta (quanto do CO₂ fixado vira massa seca)")
ax.set_ylabel("massa fresca por pé (g)")
ax.set_title("Calibração: um coeficiente leva a alface simulada ao tamanho real")
ax.legend(loc="upper left", fontsize=9)
salvar(fig, "02-calibracao.png")

# --- Passo 03: nota ≠ lucro ---------------------------------------------------
# 35 dias, clima ameno semente 1 (controle/ciclo.py). lucro = nota + punição.
nomes = ["Regras fixas", "PID"]
lucro, punicao, nota = [1690, 1625], [1326, 948], [364, 677]
x = range(len(nomes))
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.bar([i - 0.27 for i in x], lucro, 0.25, color=VERDE, label="lucro (receita − custos)")
ax.bar(list(x), [-p for p in punicao], 0.25, color=VERMELHO, label="punição (fora do meio da faixa)")
ax.bar([i + 0.27 for i in x], nota, 0.25, color=AZUL, label="nota = lucro − punição")
for i in x:
    for dx, v in ((-0.27, lucro[i]), (0, -punicao[i]), (0.27, nota[i])):
        ax.text(i + dx, v + (40 if v >= 0 else -110), f"R$ {v:,}".replace(",", "."), ha="center", fontsize=9)
ax.axhline(0, color="black", lw=0.8)
ax.set_xticks(list(x), nomes)
ax.set_ylabel("R$ por ciclo (estufa de 1000 pés)")
ax.set_title("O PID lucra um pouco menos, mas cuida melhor do clima e tira nota maior")
ax.legend(fontsize=9, loc="upper center", bbox_to_anchor=(0.5, -0.1), ncol=3, frameon=False)
ax.set_ylim(-1600, 2100)
salvar(fig, "03-nota-e-lucro.png")

# --- Passo 04: ensaio 1, energia ------------------------------------------------
# treino.relatorio do ensaio 1 (campeão da geração 10), média de 10 climas inéditos.
ctrl = ["Campeão\n(geração 10)", "Regras fixas", "PID", "Não fazer\nnada"]
energia = [1206, 164, 169, 0]
nota4 = [-513, 360, 679, -8379]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4.2))
a1.bar(ctrl, energia, color=[LARANJA, CINZA, ROXO, CINZA])
for i, v in enumerate(energia):
    a1.text(i, v + 20, f"{v} kWh", ha="center", fontsize=9)
a1.set_title("Energia no ciclo: o campeão gasta 7×")
a1.set_ylabel("kWh por ciclo")
a2.bar(ctrl[:3], nota4[:3], color=[LARANJA, CINZA, ROXO])
for i, v in enumerate(nota4[:3]):
    a2.text(i, v + (25 if v >= 0 else -70), f"R$ {v}", ha="center", fontsize=9)
a2.axhline(0, color="black", lw=0.8)
a2.set_title("Nota (não fazer nada: R$ −8.379, fora da escala)")
a2.set_ylabel("R$ por ciclo")
salvar(fig, "04-ensaio1-energia.png")

# --- Passo 05: ensaio 1 × ensaio 2 (mesma semente: o mesmo clima a cada geração) ---
# Melhor nota por geração, dos treino.log de treino/saidas/ensaio e ensaio2.
ens1 = [-887, -837, -865, -658, -714, -583, -536, -606, -421, -499, -419]
ens2 = [-543, -448, -339, -301, -208, -199, -227, -104, -24, -110]
regras = [357, 256, 311, 352, 301, 413, 355, 276, 393, 395, 417]
fig, ax = plt.subplots(figsize=(9.5, 4.4))
ax.plot(range(1, 12), ens1, "o-", color=LARANJA, label="ensaio 1: redes nascem com tudo a ~50%")
ax.plot(range(1, 11), ens2, "o-", color=AZUL, lw=2.2, label="ensaio 2: redes nascem com tudo a ~12%")
ax.plot(range(1, 12), regras, "--", color=CINZA, label="regras fixas (mesmo clima)")
ax.set_xlabel("geração")
ax.set_ylabel("melhor nota (R$ por ciclo)")
ax.set_title("Começar com os atuadores quase desligados: ~R$ 400 melhor desde a 1ª geração")
ax.legend(fontsize=9)
ax.grid(alpha=0.3)
salvar(fig, "05-ensaios-comparados.png")
