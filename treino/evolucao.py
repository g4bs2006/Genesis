"""
A neuroevolução: de uma geração de redes para a próxima.

Igual ao estudo (estudo/evolucao.py), mas com a população inteira como um
tensor [P, n_pesos] e as operações feitas de uma vez em todas as linhas:

  ELITISMO: as melhores passam intactas (5%).
  TORNEIO: para escolher cada pai, sorteia 3 redes e fica com a melhor.
  CRUZAMENTO UNIFORME: cada peso do filho vem do pai A ou do B, cara ou coroa.
  MUTAÇÃO: soma-se a cada peso um ruído normal pequeno (desvio `sigma`).
"""

from __future__ import annotations

import torch


def proxima_geracao(
    pop: torch.Tensor,
    notas: torch.Tensor,
    g: torch.Generator,
    elite: float = 0.05,
    torneio: int = 3,
    sigma: float = 0.03,
) -> torch.Tensor:
    p, n = pop.shape
    n_elite = max(1, round(elite * p))
    ordem = torch.argsort(notas, descending=True)
    filhos = p - n_elite

    def escolher_pais() -> torch.Tensor:
        sorteados = torch.randint(0, p, (filhos, torneio), generator=g)  # [filhos, 3]
        vencedor = notas[sorteados].argmax(dim=1)  # o melhor de cada trio
        return pop[sorteados[torch.arange(filhos), vencedor]]

    a, b = escolher_pais(), escolher_pais()
    moeda = torch.rand(filhos, n, generator=g) < 0.5
    filho = torch.where(moeda, a, b) + torch.randn(filhos, n, generator=g) * sigma
    return torch.cat([pop[ordem[:n_elite]], filho])


def fatiar(obs, inicio: int, fim: int):
    """O mesmo dicionário de sensores, só com as estufas de inicio a fim."""
    if isinstance(obs, dict):
        return {k: fatiar(v, inicio, fim) for k, v in obs.items()}
    return obs[inicio:fim]


class Combinado:
    """
    Vários controladores numa simulação só: o primeiro cuida das primeiras
    estufas, o segundo das seguintes... Assim as P redes e as regras fixas
    rodam juntas, no mesmo clima, e a régua da geração sai quase de graça.
    """

    def __init__(self, *partes: tuple[object, int]):
        self.partes = partes  # (controlador, quantas estufas)

    def reiniciar(self) -> None:
        for c, _ in self.partes:
            if hasattr(c, "reiniciar"):
                c.reiniciar()

    def decidir(self, obs: dict) -> dict:
        inicio, decisoes = 0, []
        for c, n in self.partes:
            decisoes.append((c.decidir(fatiar(obs, inicio, inicio + n)), n))
            inicio += n
        nomes = {k for d, _ in decisoes for k in d}
        um = obs["ar"]["temperatura"]
        return {
            k: torch.cat([(torch.zeros(n, dtype=um.dtype) + d[k]) if k in d else torch.zeros(n, dtype=um.dtype)
                          for d, n in decisoes])
            for k in nomes
        }
