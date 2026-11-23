"""
Passo 2 do estudo: a rede neural.

Uma rede neural pequena, que olha os sensores da estufa de brinquedo e decide
o quanto ligar o exaustor e a nebulização. Aqui os pesos ainda são SORTEADOS:
a rede não sabe nada. Aprender é o passo 3.

    entradas (6)  ->  camada oculta (16 neurônios, tanh)  ->  saídas (2, sigmoide)

Rode com:  python estudo/rede.py
"""

import numpy as np

from estufa import regras_fixas, simular, sortear_clima

N_ENTRADAS = 6
N_OCULTOS = 16
N_SAIDAS = 2  # exaustor, nebulização

# Quantos números (pesos) a rede tem ao todo:
#   camada 1: cada uma das 6 entradas liga em cada um dos 16 neurônios (6 x 16 pesos)
#             + 1 viés por neurônio (16)
#   camada 2: cada um dos 16 neurônios liga em cada uma das 2 saídas (16 x 2)
#             + 1 viés por saída (2)
N_PESOS = N_ENTRADAS * N_OCULTOS + N_OCULTOS + N_OCULTOS * N_SAIDAS + N_SAIDAS  # 146


def observar(sensores):
    """
    Transforma as leituras dos sensores nas entradas da rede.

    NORMALIZAR: deixar cada entrada mais ou menos entre -1 e 1. Se uma entrada
    vale 30 (°C) e outra vale 0,5 (sol), a de 30 domina as contas só por ser
    um número maior, não por ser mais importante. Com todas na mesma escala, a
    rede começa sem esse viés.

    A hora entra como seno e cosseno: assim 23h e 0h ficam perto uma da outra
    (como num relógio), em vez de 23 e 0 parecerem opostos.
    """
    angulo = 2 * np.pi * sensores["hora"] / 24
    entradas = [
        (sensores["t_int"] - 22) / 8,                      # temperatura de dentro
        (sensores["t_int"] - sensores["t_int_1h"]) / 2,    # tendência: subindo (+) ou caindo (-)
        (sensores["t_ext"] - 22) / 8,                      # temperatura de fora
        sensores["sol"],                                   # já está entre 0 e 1
        np.sin(angulo),                                    # hora do dia, parte 1
        np.cos(angulo),                                    # hora do dia, parte 2
    ]
    return np.stack(entradas, axis=1)  # tabela [n estufas, 6 entradas]


def desempacotar(pesos):
    """
    Cada rede é guardada como uma lista reta de 146 números (fica fácil de
    cruzar e mutar no passo 3). Para fazer as contas, recortamos a lista nas
    quatro partes da rede.

    `pesos` tem formato [n redes, 146]. Devolve:
      W1 [n, 6, 16]  pesos da camada 1
      b1 [n, 16]     vieses da camada 1
      W2 [n, 16, 2]  pesos da camada 2
      b2 [n, 2]      vieses da camada 2
    """
    n = pesos.shape[0]
    i = 0

    def pegar(*formato):
        nonlocal i
        tamanho = int(np.prod(formato))
        parte = pesos[:, i:i + tamanho].reshape(n, *formato)
        i += tamanho
        return parte

    W1 = pegar(N_ENTRADAS, N_OCULTOS)
    b1 = pegar(N_OCULTOS)
    W2 = pegar(N_OCULTOS, N_SAIDAS)
    b2 = pegar(N_SAIDAS)
    return W1, b1, W2, b2


def sigmoide(x):
    """Espreme qualquer número para entre 0 e 1. Bom para "quanto ligar"."""
    return 1 / (1 + np.exp(-x))


def decidir(pesos, entradas, mostrar=False):
    """
    A rede em ação: cada estufa n usa a SUA rede (seus próprios pesos).

    Um neurônio faz: soma(entrada x peso) + viés, e passa por uma ATIVAÇÃO.
    A ativação "entorta" o resultado. Sem ela, empilhar camadas não adiantaria
    nada: uma conta linear de uma conta linear continua linear, e a rede só
    conseguiria aprender regras do tipo "uma reta".

    np.einsum("ni,nij->nj") lê-se: para cada estufa n e cada neurônio j,
    some entradas[n, i] * W1[n, i, j] em todos os i. É a "soma ponderada" de
    todos os neurônios de todas as redes numa conta só.
    """
    W1, b1, W2, b2 = desempacotar(pesos)

    oculta = np.tanh(np.einsum("ni,nij->nj", entradas, W1) + b1)  # tanh: entre -1 e 1
    saidas = sigmoide(np.einsum("nj,njk->nk", oculta, W2) + b2)   # sigmoide: entre 0 e 1

    if mostrar:
        np.set_printoptions(precision=2, suppress=True)
        print("  entradas:       ", entradas[0])
        print("  camada oculta:  ", oculta[0])
        print("  saídas:         ", saidas[0], " -> [exaustor, nebulização]")
    return saidas


def politica_da_rede(pesos):
    """
    Embrulha a rede no formato que o simulador espera: uma função que recebe
    os sensores e devolve as ações. A estufa 0 usa a rede 0, a 1 usa a 1...
    """
    def politica(sensores):
        return decidir(pesos, observar(sensores))
    return politica


def pesos_aleatorios(n, rng, escala=0.5):
    """Sorteia n redes, com pesos pequenos em torno de zero (distribuição normal)."""
    return rng.normal(0.0, escala, size=(n, N_PESOS))


if __name__ == "__main__":
    rng = np.random.default_rng(seed=7)

    print(f"A rede tem {N_PESOS} pesos: {N_ENTRADAS}x{N_OCULTOS} + {N_OCULTOS} + "
          f"{N_OCULTOS}x{N_SAIDAS} + {N_SAIDAS}")
    print()

    # 1. Uma rede só, fazendo uma decisão, para ver os números passando.
    print("Uma rede sorteada decidindo às 14h, com 29 °C dentro, subindo, 31 °C fora, sol forte:")
    uma_rede = pesos_aleatorios(1, rng)
    sensores = {
        "t_int": np.array([29.0]), "t_int_1h": np.array([27.5]),
        "t_ext": np.array([31.0]), "sol": np.array([0.85]), "hora": np.array([14.0]),
    }
    decidir(uma_rede, observar(sensores), mostrar=True)
    print("  (os pesos são sorteados, então a decisão é um chute)")
    print()

    # 2. Duzentas redes sorteadas, cada uma cuidando da sua estufa, no mesmo clima.
    n = 200
    clima = sortear_clima(dias=3, rng=np.random.default_rng(seed=42))
    populacao = pesos_aleatorios(n, rng)
    notas = simular(politica_da_rede(populacao), clima, n)
    nota_regras = simular(regras_fixas, clima, n=1)[0]

    print(f"{n} redes sorteadas, 3 dias de estufa cada, todas ao mesmo tempo:")
    print(f"  melhor nota:  {notas.max():8.1f}")
    print(f"  nota mediana: {np.median(notas):8.1f}")
    print(f"  pior nota:    {notas.min():8.1f}")
    print(f"  regras fixas: {nota_regras:8.1f}   (para comparar)")
