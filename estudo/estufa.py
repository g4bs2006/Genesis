"""
Passo 1 do estudo: uma estufa de brinquedo.

Uma estufa bem simplificada, com UMA variável (a temperatura do ar de dentro)
e DOIS atuadores (exaustor e nebulização). Serve para entender três coisas que
o Genesis de verdade também vai ter:

  1. um simulador que avança o tempo em passos de 10 minutos;
  2. uma "política": quem decide o que ligar a cada passo (regras fixas agora,
     uma rede neural no passo 2);
  3. uma nota que diz se o cultivo foi bom ou ruim.

Rode com:  python estudo/estufa.py
"""

import numpy as np

# ---------------------------------------------------------------------------
# Constantes da estufa de brinquedo
# ---------------------------------------------------------------------------

MINUTOS_POR_PASSO = 10
PASSOS_POR_DIA = 24 * 60 // MINUTOS_POR_PASSO  # 144 passos = 1 dia

# Faixa de temperatura boa para a alface (aproximada, para o brinquedo).
FAIXA_MIN = 18.0
FAIXA_MAX = 26.0

# A física, em °C por passo de 10 minutos. Os números foram escolhidos para o
# problema ser possível mas não trivial: à tarde, sem fazer nada, a estufa
# passa dos 35 °C; ligando as coisas na hora certa, dá para ficar na faixa.
TROCA_PASSIVA = 0.02   # quanto o ar de dentro "puxa" para a temperatura de fora, sozinho (frestas, paredes)
TROCA_EXAUSTOR = 0.15  # quanto a mais ele puxa com o exaustor a 100%
AQUECE_SOL = 0.35      # quanto o sol pleno esquenta por passo (efeito estufa)
ESFRIA_NEBULIZ = 1.5   # quanto a nebulização a 100% esfria por passo (a água evaporando rouba calor)

# A nota. Cada passo custa pontos; a nota final é o MENOS custo total
# (então a melhor nota possível é 0, e quanto mais negativa, pior).
CUSTO_GRAU_FORA = 1.0   # por °C fora da faixa, por passo: o que mais importa é a alface
CUSTO_EXAUSTOR = 0.02   # por passo com o exaustor a 100% (energia)
CUSTO_NEBULIZ = 0.05    # por passo com a nebulização a 100% (água + energia da bomba)


# ---------------------------------------------------------------------------
# O clima de fora
# ---------------------------------------------------------------------------

def sortear_clima(dias, rng):
    """
    Sorteia o clima de fora para alguns dias.

    Cada dia tem uma temperatura média, uma amplitude (diferença entre o
    calor da tarde e o frio da madrugada) e uma nebulosidade (quanto de sol
    passa). No Genesis de verdade, isto vira dados reais do INMET.

    `rng` é o gerador de números aleatórios. Usar sempre o mesmo gerador com a
    mesma SEMENTE (o número inicial) dá sempre o mesmo clima: é assim que todos
    os agentes de uma geração enfrentam exatamente o mesmo tempo.

    Devolve um dicionário com uma lista de valores por passo:
      t_ext: temperatura de fora (°C)
      sol:   intensidade do sol (0 = noite, 1 = sol pleno)
      hora:  hora do dia (0 a 24)
    """
    passos = dias * PASSOS_POR_DIA
    tempo_em_dias = np.arange(passos) * MINUTOS_POR_PASSO / 60 / 24
    hora = (tempo_em_dias * 24) % 24

    # Sorteia um valor por dia (mais um, para o fim do último dia) e passa de
    # um para o outro aos poucos (np.interp), para o clima não dar um salto à
    # meia-noite.
    def suave(minimo, maximo):
        valores = rng.uniform(minimo, maximo, size=dias + 1)
        return np.interp(tempo_em_dias, np.arange(dias + 1), valores)

    media = suave(21, 28)
    amplitude = suave(4, 8)
    nuvens = suave(0.5, 1.0)  # 1 = céu limpo

    # Senoide com o pico às 15h e o mínimo às 3h.
    t_ext = media + amplitude * np.sin(2 * np.pi * (hora - 9) / 24)
    # Sol: zero à noite, sobe das 6h, pico ao meio-dia, zero às 18h.
    sol = nuvens * np.clip(np.sin(np.pi * (hora - 6) / 12), 0, None)

    return {"t_ext": t_ext, "sol": sol, "hora": hora}


# ---------------------------------------------------------------------------
# O simulador
# ---------------------------------------------------------------------------

def simular(politica, clima, n, guardar=False):
    """
    Roda N estufas ao mesmo tempo, todas com o mesmo clima.

    Cada estufa é uma posição numa tabela (um array do NumPy): t_int[0] é a
    temperatura da estufa 0, t_int[1] a da estufa 1, e assim por diante. Em vez
    de um laço "para cada estufa", fazemos a conta na tabela inteira de uma
    vez. É isso que, no Genesis, a GPU vai fazer com milhares de estufas.

    `politica` é uma função que recebe o que os sensores leem e devolve, para
    cada estufa, duas ações entre 0 e 1: [exaustor, nebulização].

    Devolve a nota de cada estufa (e o histórico, se `guardar=True`).
    """
    passos = len(clima["t_ext"])

    # Começa à meia-noite, um pouco mais quente que fora.
    t_int = np.full(n, clima["t_ext"][0] + 1.0)

    # Guardamos a temperatura de 1 hora atrás (6 passos) para a política saber
    # se está esquentando ou esfriando. Começa igual à atual.
    passos_por_hora = 60 // MINUTOS_POR_PASSO
    ultimas = [t_int.copy() for _ in range(passos_por_hora)]

    custo = np.zeros(n)
    historico = {"t_int": [], "exaustor": [], "nebuliz": []}

    for p in range(passos):
        t_ext = clima["t_ext"][p]
        sol = clima["sol"][p]

        # 1. O que os sensores leem neste passo.
        sensores = {
            "t_int": t_int,
            "t_int_1h": ultimas[0],  # a leitura mais antiga guardada
            "t_ext": np.full(n, t_ext),
            "sol": np.full(n, sol),
            "hora": np.full(n, clima["hora"][p]),
        }

        # 2. A política decide. np.clip garante que fica entre 0 e 1.
        acoes = np.clip(politica(sensores), 0.0, 1.0)
        exaustor = acoes[:, 0]
        nebuliz = acoes[:, 1]

        # 3. A física avança 10 minutos.
        #    - troca com fora: puxa t_int em direção a t_ext, mais forte com exaustor;
        #    - sol: esquenta;
        #    - nebulização: esfria.
        troca = (TROCA_PASSIVA + TROCA_EXAUSTOR * exaustor) * (t_ext - t_int)
        t_int = t_int + troca + AQUECE_SOL * sol - ESFRIA_NEBULIZ * nebuliz

        # 4. A nota: quantos graus fora da faixa, mais o gasto dos atuadores.
        graus_fora = np.clip(FAIXA_MIN - t_int, 0, None) + np.clip(t_int - FAIXA_MAX, 0, None)
        custo += CUSTO_GRAU_FORA * graus_fora + CUSTO_EXAUSTOR * exaustor + CUSTO_NEBULIZ * nebuliz

        # Atualiza a memória de 1 hora: tira a mais antiga, põe a nova.
        ultimas.pop(0)
        ultimas.append(t_int.copy())

        if guardar:
            historico["t_int"].append(t_int.copy())
            historico["exaustor"].append(exaustor.copy())
            historico["nebuliz"].append(nebuliz.copy())

    nota = -custo
    if guardar:
        return nota, {k: np.array(v) for k, v in historico.items()}
    return nota


# ---------------------------------------------------------------------------
# Duas políticas simples, para comparar
# ---------------------------------------------------------------------------

def nao_fazer_nada(sensores):
    """Nunca liga nada. Mostra o quanto a estufa sofre sozinha."""
    n = len(sensores["t_int"])
    return np.zeros((n, 2))


def regras_fixas(sensores):
    """
    Como a maioria das estufas funciona hoje: termostato.
    Passou de 24 °C, liga o exaustor; passou de 26 °C, liga também a nebulização.
    """
    t = sensores["t_int"]
    exaustor = (t > 24).astype(float)  # True/False vira 1.0/0.0
    nebuliz = (t > 26).astype(float)
    return np.stack([exaustor, nebuliz], axis=1)  # junta em [n, 2]


# ---------------------------------------------------------------------------
# Rodando o passo 1
# ---------------------------------------------------------------------------

def desenhar(clima, historicos, titulos, arquivo):
    """Desenha a temperatura de dentro e de fora, a faixa boa e as ações."""
    import matplotlib
    matplotlib.use("Agg")  # desenha direto em arquivo, sem abrir janela
    import matplotlib.pyplot as plt

    horas = np.arange(len(clima["t_ext"])) * MINUTOS_POR_PASSO / 60
    fig, eixos = plt.subplots(len(historicos), 1, figsize=(11, 3.6 * len(historicos)), sharex=True)
    eixos = np.atleast_1d(eixos)

    for eixo, hist, titulo in zip(eixos, historicos, titulos):
        eixo.axhspan(FAIXA_MIN, FAIXA_MAX, color="green", alpha=0.12, label="faixa boa")
        eixo.plot(horas, clima["t_ext"], color="gray", ls="--", label="fora")
        eixo.plot(horas, hist["t_int"][:, 0], color="crimson", lw=2, label="dentro")
        eixo.set_ylabel("°C")
        eixo.set_title(titulo)

        acoes = eixo.twinx()  # segundo eixo, à direita, para as ações (0 a 1)
        acoes.fill_between(horas, hist["exaustor"][:, 0], step="post", color="tab:blue", alpha=0.25, label="exaustor")
        acoes.fill_between(horas, hist["nebuliz"][:, 0], step="post", color="tab:cyan", alpha=0.45, label="nebulização")
        acoes.set_ylim(0, 4)  # ações ocupam só a parte de baixo do gráfico
        acoes.set_yticks([0, 1])
        linhas = eixo.get_legend_handles_labels()
        linhas2 = acoes.get_legend_handles_labels()
        eixo.legend(linhas[0] + linhas2[0], linhas[1] + linhas2[1], loc="upper left", fontsize=8, ncol=5)

    eixos[-1].set_xlabel("horas desde o início")
    fig.tight_layout()
    fig.savefig(arquivo, dpi=110)
    print(f"gráfico salvo em {arquivo}")


if __name__ == "__main__":
    from pathlib import Path

    rng = np.random.default_rng(seed=42)
    clima = sortear_clima(dias=3, rng=rng)

    nota_nada, hist_nada = simular(nao_fazer_nada, clima, n=1, guardar=True)
    nota_regras, hist_regras = simular(regras_fixas, clima, n=1, guardar=True)

    print(f"Clima: 3 dias, {len(clima['t_ext'])} passos de {MINUTOS_POR_PASSO} min")
    print(f"Fora: de {clima['t_ext'].min():.1f} a {clima['t_ext'].max():.1f} °C")
    print()
    print(f"Não fazer nada:  nota {nota_nada[0]:8.1f}   (dentro chegou a {hist_nada['t_int'].max():.1f} °C)")
    print(f"Regras fixas:    nota {nota_regras[0]:8.1f}   (dentro chegou a {hist_regras['t_int'].max():.1f} °C)")

    saidas = Path(__file__).parent / "saidas"
    saidas.mkdir(exist_ok=True)
    desenhar(
        clima,
        [hist_nada, hist_regras],
        [f"Não fazer nada (nota {nota_nada[0]:.0f})", f"Regras fixas (nota {nota_regras[0]:.0f})"],
        saidas / "1_estufa.png",
    )
