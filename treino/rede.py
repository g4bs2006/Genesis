"""
A rede neural do agente: MLP 20 → 32 → 32 → 8 (docs/plano.md, "A rede neural").

Igual ao dashboard (dashboard/src/modules/treino/domain/rede.ts): mesmas 20
entradas na mesma ordem, mesma normalização, mesmas 8 saídas, mesma ordem dos
pesos. Se mudar aqui, muda lá (e o normalizacao.json avisa o dashboard).

No estudo (estudo/rede.py) a rede era 6 → 16 → 2 em NumPy. Aqui muda:
  - mais entradas e saídas, e duas camadas ocultas;
  - PyTorch, com a POPULAÇÃO INTEIRA de uma vez: os pesos são um tensor
    [P, n_pesos] (uma linha por rede) e a conta de todas sai junto.
"""

from __future__ import annotations

import math

import torch

ARQUITETURA = (20, 32, 32, 8)

# (id, de onde vem o valor cru, centro, largura). Normalizar = (cru − centro) ÷ largura,
# cortado em ±2: CO2 (centenas de ppm) e pH (unidades) chegam à rede do mesmo tamanho,
# e um sensor maluco não grita mais alto que os outros.
ENTRADAS = (
    ("arTemperatura", ("ar", "temperatura"), 22.0, 10.0),
    ("arUmidade", ("ar", "umidade"), 70.0, 30.0),
    ("arVpd", ("ar", "vpd"), 0.85, 0.85),
    ("arCo2", ("ar", "co2"), 700.0, 500.0),
    ("arLuz", ("ar", "luz"), 300.0, 300.0),
    ("ph", ("solucao", "ph"), 6.0, 1.0),
    ("ec", ("solucao", "ec"), 1.5, 1.0),
    ("temperaturaAgua", ("solucao", "temperaturaAgua"), 21.0, 6.0),
    ("nivel", ("solucao", "nivel"), 0.5, 0.5),
    ("foraTemperatura", ("fora", "temperatura"), 22.0, 15.0),
    ("foraUmidade", ("fora", "umidade"), 60.0, 40.0),
    ("foraRadiacao", ("fora", "radiacao"), 500.0, 500.0),
    ("horaSeno", None, 0.0, 1.0),  # hora num círculo: 23h fica perto de 0h
    ("horaCosseno", None, 0.0, 1.0),
    ("diaDoCiclo", ("tempo", "diaDoCiclo"), 17.5, 17.5),
    ("tarifa", ("tarifaKwh",), 0.9, 0.6),
    # tendência: quanto mudou na última hora. A MLP não tem memória; sem isto,
    # não saberia se a temperatura está subindo ou descendo.
    ("variacaoTemperatura", ("ar", "temperatura"), 0.0, 3.0),
    ("variacaoUmidade", ("ar", "umidade"), 0.0, 15.0),
    ("variacaoPh", ("solucao", "ph"), 0.0, 0.3),
    ("variacaoEc", ("solucao", "ec"), 0.0, 0.3),
)
SAIDAS = ("exaustor", "sombreamento", "nebulizacao", "luz", "dosagemAB", "dosagemAcido", "reposicaoAgua", "bomba")
PASSOS_POR_HORA = 6


def n_pesos(arq=ARQUITETURA) -> int:
    """Cada camada: entradas × saídas ligações + 1 viés por saída. 20→32→32→8 dá 1992."""
    return sum(a * b + b for a, b in zip(arq[:-1], arq[1:]))


def normalizacao() -> list[dict]:
    """O que vai no normalizacao.json: o dashboard usa a mesma conta."""
    return [
        {"id": i, "centro": c, "largura": l, "corte": 2.0,
         **({"transformacao": "sen(2π·hora/24)" if i == "horaSeno" else "cos(2π·hora/24)"} if o is None else {})}
        for i, o, c, l in ENTRADAS
    ]


def _valor(obs: dict, caminho: tuple) -> torch.Tensor:
    v = obs
    for parte in caminho:
        v = v[parte]
    return v


def camadas(pesos: torch.Tensor, arq=ARQUITETURA) -> list[tuple[torch.Tensor, torch.Tensor]]:
    """
    Fatia os pesos [P, n] em (W [P, entradas, saídas], b [P, saídas]) por camada,
    na ordem do contrato: a matriz (linha por entrada) e depois os vieses.
    """
    p, inicio, resultado = pesos.shape[0], 0, []
    for a, b in zip(arq[:-1], arq[1:]):
        w = pesos[:, inicio:inicio + a * b].reshape(p, a, b)
        inicio += a * b
        vies = pesos[:, inicio:inicio + b]
        inicio += b
        resultado.append((w, vies))
    return resultado


def propagar(pesos: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
    """
    x [P, 20] → saídas [P, 8]. Rede p recebe a linha p de x. Ocultas com tanh
    (−1 a 1: entorta a conta), saída com sigmoide (0 a 1: "quanto ligar").
    """
    cs = camadas(pesos)
    for k, (w, b) in enumerate(cs):
        x = torch.einsum("pi,pio->po", x, w) + b  # cada rede com a sua matriz
        x = torch.sigmoid(x) if k == len(cs) - 1 else torch.tanh(x)
    return x


def pesos_iniciais(p: int, g: torch.Generator, arq=ARQUITETURA) -> torch.Tensor:
    """
    P redes sorteadas. Cada peso ~ normal com desvio 1/√(entradas da camada),
    para a soma de um neurônio começar do tamanho de uma entrada (nem morta em
    zero, nem saturada em ±1). Vieses começam em zero.
    """
    partes = []
    for a, b in zip(arq[:-1], arq[1:]):
        partes.append(torch.randn(p, a * b, generator=g) / math.sqrt(a))
        partes.append(torch.zeros(p, b))
    return torch.cat(partes, dim=1)


class ControladorRede:
    """Uma rede por estufa: a estufa i é controlada pela rede da linha i de `pesos`."""

    def __init__(self, pesos: torch.Tensor):
        self.pesos = pesos
        self.historico: list[dict] = []

    def reiniciar(self) -> None:
        self.historico = []

    def entradas(self, obs: dict) -> torch.Tensor:
        """Do que os sensores leem aos 20 números normalizados, [P, 20]."""
        agora = {n: _valor(obs, c).clone() for n, c, _, _ in ENTRADAS if n.startswith("variacao")}
        self.historico.append(agora)
        uma_hora_atras = self.historico[0]  # no começo do ciclo, a tendência é zero
        if len(self.historico) > PASSOS_POR_HORA:
            self.historico.pop(0)
        angulo = 2 * math.pi * obs["tempo"]["hora"] / 24
        colunas = []
        for nome, caminho, centro, largura in ENTRADAS:
            if nome == "horaSeno":
                colunas.append(torch.sin(angulo))
                continue
            if nome == "horaCosseno":
                colunas.append(torch.cos(angulo))
                continue
            v = agora[nome] - uma_hora_atras[nome] if nome.startswith("variacao") else _valor(obs, caminho)
            colunas.append(((v - centro) / largura).clamp(-2, 2))
        return torch.stack(colunas, dim=1)

    def decidir(self, obs: dict) -> dict:
        s = propagar(self.pesos, self.entradas(obs))
        return {nome: s[:, k] for k, nome in enumerate(SAIDAS)}
