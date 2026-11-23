"""
Passo 3 do estudo: a evolução (neuroevolução).

Uma população de redes sorteadas cultiva a estufa de brinquedo. A cada
geração, as melhores passam adiante e as outras nascem do cruzamento das boas,
com mutação. Ninguém ensina à rede o que fazer: ela só recebe a nota no fim.

Rode com:  python estudo/evolucao.py
"""

from pathlib import Path

import numpy as np

from estufa import desenhar, nao_fazer_nada, regras_fixas, simular, sortear_clima
from rede import N_PESOS, pesos_aleatorios, politica_da_rede

# ---------------------------------------------------------------------------
# Os botões da evolução (HIPERPARÂMETROS: escolhas nossas, não aprendidas)
# ---------------------------------------------------------------------------

POPULACAO = 200     # quantas redes (e estufas) por geração
GERACOES = 150      # quantas rodadas de seleção
DIAS = 3            # dias de estufa por avaliação
ELITE = 10          # as 10 melhores (5%) passam intactas: ELITISMO
TORNEIO = 3         # para escolher um pai, sorteia 3 e fica com o melhor
MUTACAO = 0.05      # tamanho do ruído somado aos pesos dos filhos


def escolher_pai(notas, rng):
    """
    SELEÇÃO POR TORNEIO: sorteia algumas redes e fica com a de maior nota.

    Por que não pegar sempre a melhor? Porque a população viraria cópias de
    uma rede só e pararia de explorar. O torneio favorece as boas, mas dá
    chance às médias, que às vezes carregam uma ideia útil.
    """
    candidatos = rng.integers(0, len(notas), size=TORNEIO)
    return candidatos[np.argmax(notas[candidatos])]


def nova_geracao(populacao, notas, rng):
    """Monta a próxima geração a partir da atual e das notas."""
    ordem = np.argsort(notas)[::-1]  # índices da melhor para a pior
    filhos = [populacao[i].copy() for i in ordem[:ELITE]]  # ELITISMO

    while len(filhos) < POPULACAO:
        pai = populacao[escolher_pai(notas, rng)]
        mae = populacao[escolher_pai(notas, rng)]

        # CRUZAMENTO: cada peso do filho vem do pai ou da mãe, no cara ou coroa.
        do_pai = rng.random(N_PESOS) < 0.5
        filho = np.where(do_pai, pai, mae)

        # MUTAÇÃO: um ruído pequeno em todos os pesos. É daqui que surge o novo;
        # sem mutação, a população só reembaralharia o que já tem.
        filho = filho + rng.normal(0.0, MUTACAO, size=N_PESOS)
        filhos.append(filho)

    return np.array(filhos)


def avaliar_em_varios(pesos, sementes):
    """Nota média de cada rede em vários climas. Mede se ela GENERALIZA."""
    notas = [simular(politica_da_rede(pesos), sortear_clima(DIAS, np.random.default_rng(s)), len(pesos))
             for s in sementes]
    return np.mean(notas, axis=0)


if __name__ == "__main__":
    rng = np.random.default_rng(seed=0)
    populacao = pesos_aleatorios(POPULACAO, rng)

    curva = {"melhor": [], "mediana": [], "regras": []}
    print("geração   melhor   mediana   regras fixas (mesmo clima)")

    for geracao in range(GERACOES):
        # Clima novo a cada geração (semente = número da geração), o MESMO para
        # todas as redes da geração: justiça na nota, e ninguém decora um clima.
        clima = sortear_clima(DIAS, np.random.default_rng(seed=geracao))

        notas = simular(politica_da_rede(populacao), clima, POPULACAO)
        nota_regras = simular(regras_fixas, clima, n=1)[0]

        curva["melhor"].append(notas.max())
        curva["mediana"].append(np.median(notas))
        curva["regras"].append(nota_regras)
        if geracao % 10 == 0 or geracao == GERACOES - 1:
            print(f"{geracao:7d} {notas.max():9.1f} {np.median(notas):9.1f} {nota_regras:12.1f}")

        if geracao < GERACOES - 1:
            populacao = nova_geracao(populacao, notas, rng)

    # -----------------------------------------------------------------------
    # O campeão: a melhor da elite final em 10 climas, não só no último.
    # Uma rede pode ter ido bem num clima por sorte; a média em vários é justa.
    # -----------------------------------------------------------------------
    elite = populacao[np.argsort(notas)[::-1][:ELITE]]
    notas_elite = avaliar_em_varios(elite, sementes=range(5000, 5010))
    campeao = elite[np.argmax(notas_elite)][None, :]  # [1, 146]

    # Prova final: 30 climas que NENHUMA rede viu no treino (sementes 10000+).
    teste = range(10_000, 10_030)
    nota_campeao = avaliar_em_varios(campeao, teste)[0]
    nota_regras = np.mean([simular(regras_fixas, sortear_clima(DIAS, np.random.default_rng(s)), 1)[0] for s in teste])
    nota_nada = np.mean([simular(nao_fazer_nada, sortear_clima(DIAS, np.random.default_rng(s)), 1)[0] for s in teste])

    print()
    print("Prova final: média em 30 climas nunca vistos no treino")
    print(f"  não fazer nada: {nota_nada:8.1f}")
    print(f"  regras fixas:   {nota_regras:8.1f}")
    print(f"  campeão:        {nota_campeao:8.1f}")

    # -----------------------------------------------------------------------
    # Gráficos e o campeão salvo
    # -----------------------------------------------------------------------
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    saidas = Path(__file__).parent / "saidas"
    saidas.mkdir(exist_ok=True)
    np.save(saidas / "campeao.npy", campeao)

    fig, eixo = plt.subplots(figsize=(10, 4.5))
    eixo.plot(curva["mediana"], color="tab:orange", alpha=0.8, label="mediana da população")
    eixo.plot(curva["melhor"], color="crimson", lw=2, label="melhor da geração")
    eixo.plot(curva["regras"], color="gray", ls="--", label="regras fixas (mesmo clima)")
    eixo.set_yscale("symlog", linthresh=100)  # escala que mostra bem os -10 mil do começo e os -50 do fim
    eixo.set_xlabel("geração")
    eixo.set_ylabel("nota (maior é melhor)")
    eixo.set_title("A evolução aprendendo")
    eixo.legend()
    fig.tight_layout()
    fig.savefig(saidas / "3_evolucao.png", dpi=110)
    print(f"gráfico salvo em {saidas / '3_evolucao.png'}")

    # O campeão e as regras fixas no mesmo clima do passo 1 (semente 42).
    clima = sortear_clima(DIAS, np.random.default_rng(seed=42))
    n_c, h_c = simular(politica_da_rede(campeao), clima, 1, guardar=True)
    n_r, h_r = simular(regras_fixas, clima, 1, guardar=True)
    desenhar(clima, [h_r, h_c],
             [f"Regras fixas (nota {n_r[0]:.0f})", f"Campeão da evolução (nota {n_c[0]:.0f})"],
             saidas / "3_campeao.png")
