"""
O clima de fora para a fase 1 do currículo: dias amenos inventados.

É o mesmo espírito de estudo/estufa.py (sortear_clima), com mais variáveis:
temperatura, umidade, radiação do sol e CO2 de fora. Os dados reais do INMET
só entram na fase 3.

Mesma SEMENTE, mesmo clima: é assim que todas as redes de uma geração enfrentam
exatamente o mesmo tempo, e a comparação entre elas é justa.
"""

from dataclasses import dataclass

import torch

MINUTOS_POR_PASSO = 10
PASSOS_POR_DIA = 24 * 60 // MINUTOS_POR_PASSO  # 144


@dataclass
class Clima:
    """
    Uma série por variável, um valor por passo de 10 minutos: tensores [passos]
    (o mesmo clima para todas as estufas) ou [passos, N] (um clima por estufa,
    ver empilhar).
    """

    temperatura: torch.Tensor  # °C
    umidade: torch.Tensor  # umidade relativa, %
    radiacao: torch.Tensor  # radiação global, W/m²
    co2: torch.Tensor  # ppm
    hora: torch.Tensor  # 0..24

    def __len__(self) -> int:
        return self.temperatura.shape[0]


def empilhar(climas: list[Clima]) -> Clima:
    """Junta climas de mesmo tamanho num só, com um clima por estufa ([passos, N])."""
    def junta(nome: str) -> torch.Tensor:
        return torch.stack([getattr(c, nome) for c in climas], dim=1)
    return Clima(*(junta(n) for n in ("temperatura", "umidade", "radiacao", "co2", "hora")))


def clima_ameno(dias: int, semente: int, device: str = "cpu") -> Clima:
    """
    Sorteia `dias` dias amenos: noites de 13 a 20 °C, tardes de 20 a 30 °C, sol
    forte ou com nuvens. Um dia de primavera no Sudeste, sem extremos.
    """
    g = torch.Generator().manual_seed(semente)
    passos = dias * PASSOS_POR_DIA
    dia = torch.arange(passos, dtype=torch.float64) / PASSOS_POR_DIA  # tempo em dias
    hora = (dia * 24) % 24

    def suave(minimo: float, maximo: float) -> torch.Tensor:
        # Um valor sorteado por dia, ligado ao do dia seguinte em linha reta,
        # para o clima não dar um salto à meia-noite.
        v = minimo + (maximo - minimo) * torch.rand(dias + 1, generator=g, dtype=torch.float64)
        i = dia.floor().long()
        f = dia - i
        return v[i] * (1 - f) + v[i + 1] * f

    media = suave(18, 24)
    amplitude = suave(3.5, 6)
    umidade_media = suave(65, 85)
    nuvens = suave(0.45, 1.0)  # 1 = céu limpo
    pico_sol = suave(750, 950)  # W/m² ao meio-dia de céu limpo

    # Temperatura: senoide com o mínimo às 3h e o máximo às 15h.
    onda = torch.sin(2 * torch.pi * (hora - 9) / 24)
    temperatura = media + amplitude * onda
    # Umidade relativa: o contrário da temperatura (a tarde quente é mais seca).
    umidade = (umidade_media - 15 * onda).clamp(30, 98)
    # Sol: zero à noite, sobe às 6h, pico ao meio-dia, zero às 18h.
    radiacao = pico_sol * nuvens * torch.sin(torch.pi * (hora - 6) / 12).clamp(min=0)
    co2 = torch.full_like(dia, 420.0)  # CO2 da atmosfera hoje, ~420 ppm

    def f32(t: torch.Tensor) -> torch.Tensor:
        return t.to(device=device, dtype=torch.float32)

    return Clima(f32(temperatura), f32(umidade), f32(radiacao), f32(co2), f32(hora))
