"""
Métricas do ciclo (o ResumoCiclo do contrato) e a NOTA em R$.

A nota é o que a evolução maximiza, então ela define o que a rede aprende.
Lição do estudo: a nota não punia nada dentro da faixa, e o campeão viveu
colado em 25,9 °C, logo abaixo do limite de 26. Aqui a punição começa no
MEIO da faixa e cresce devagar até a borda; fora dela, cresce rápido.

    nota = receita − custos − punição      (R$ por ciclo, estufa inteira)

Receita e custos usam as MESMAS contas e preços do dashboard
(dashboard/src/modules/dinheiro/domain/contas.ts e precosLocal), para o número
do treino e o da tela de Dinheiro baterem.
"""

import torch

from controle.seguranca import POTENCIA_W_M2
from simulador.clima import MINUTOS_POR_PASSO
from simulador.parametros import Adaptacao

# Preços padrão do dashboard (repositorioPrecosLocal.ts, PRECOS_PADRAO), cenário médio.
PRECOS = {
    "alfacePorPe": 2.0,
    # Equatorial Goiás, com impostos (decisão 0009); a fase 1 treinou com 0,85
    "tarifaKwh": 1.28,
    "aguaPorM3": 8.0,
    "mudaPorUnidade": 0.15,
    "fixosPorCiclo": 180.0,
}
# A régua de peso do dashboard (contas.ts): pé de 220 g vale o preço cheio,
# abaixo de 120 g não vende, e um pé grande vale no máximo 10% a mais.
MASSA_COMERCIAL_G, MASSA_MINIMA_VENDA_G, FATOR_PESO_MAXIMO = 220.0, 120.0, 1.1
PLANTAS = 1000  # pés por estufa, como nas estufas de exemplo do dashboard

# As faixas boas do dashboard (estufa/domain/faixas.ts) das variáveis que a fase 1 controla.
FAIXAS = {
    "temperatura": (18.0, 26.0),
    "umidade": (60.0, 80.0),
    "vpd": (0.5, 1.2),
    "co2": (400.0, 1000.0),
}
# Peso de cada variável na punição. A umidade fica de fora: o VPD já mede o
# que ela faz com a planta, e contar as duas puniria o mesmo problema duas vezes.
PESOS = {"temperatura": 1.0, "vpd": 1.0, "co2": 0.5}
# R$ por passo de 10 min: na borda da faixa (cresce como d² do meio até a borda) ...
PUNICAO_NA_BORDA = 0.01
# ... e por "meia faixa" além da borda (cresce em linha reta fora da faixa).
PUNICAO_FORA = 0.5
PUNICAO_BARRADA = 0.05  # R$ por ação barrada pela segurança


def fator_peso(massa_g: torch.Tensor) -> torch.Tensor:
    """Quanto do preço cheio o pé vale pelo peso (igual a fatorPeso do dashboard)."""
    f = (massa_g / MASSA_COMERCIAL_G).clamp(0, FATOR_PESO_MAXIMO)
    return torch.where(massa_g < MASSA_MINIMA_VENDA_G, torch.zeros_like(f), f)


class Medidor:
    """Soma, passo a passo, o que cada uma das N estufas gastou e sofreu."""

    def __init__(self, n: int, ad: Adaptacao = Adaptacao()):
        self.ad = ad
        self.area = PLANTAS / ad.pes_por_m2  # m² de bancada da estufa
        z = torch.zeros(n)
        self.passos = 0
        self.energia_kwh = z.clone()
        self.agua_l = z.clone()
        self.punicao = z.clone()
        self.barradas = z.clone()
        self.fora_qualquer = z.clone()
        self.fora = {v: z.clone() for v in FAIXAS}

    def registrar(self, obs: dict, acoes: dict, barradas: dict) -> None:
        horas = MINUTOS_POR_PASSO / 60
        watts = sum(acoes.get(k, 0.0) * w for k, w in POTENCIA_W_M2.items()) * self.area
        self.energia_kwh += watts * horas / 1000
        # água da névoa (kg = L): a vazão máxima × quanto ligou × 600 s × área
        self.agua_l += acoes.get("nebulizacao", 0.0) * self.ad.nebulizacao_max * MINUTOS_POR_PASSO * 60 * self.area

        algum_fora = torch.zeros_like(self.punicao, dtype=torch.bool)
        for v, (lo, hi) in FAIXAS.items():
            x = obs["ar"][v]
            fora = (x < lo) | (x > hi)
            self.fora[v] += fora.float()
            algum_fora |= fora
            if v in PESOS:
                centro, meia = (lo + hi) / 2, (hi - lo) / 2
                d = (x - centro).abs() / meia  # 0 no meio, 1 na borda
                self.punicao += PESOS[v] * (PUNICAO_NA_BORDA * d.clamp(max=1) ** 2 + PUNICAO_FORA * (d - 1).clamp(min=0))
        self.fora_qualquer += algum_fora.float()
        n_barradas = sum(m.float() for m in barradas.values())
        self.barradas += n_barradas
        self.punicao += PUNICAO_BARRADA * n_barradas
        self.passos += 1

    def nota(self, massa_g: torch.Tensor) -> torch.Tensor:
        """A nota em R$ do ciclo, uma por estufa."""
        receita = PLANTAS * PRECOS["alfacePorPe"] * fator_peso(massa_g)
        custos = (
            self.energia_kwh * PRECOS["tarifaKwh"]
            + self.agua_l / 1000 * PRECOS["aguaPorM3"]
            + PLANTAS * PRECOS["mudaPorUnidade"]
            + PRECOS["fixosPorCiclo"]
        )
        return receita - custos - self.punicao

    def resumo(self, i: int, estufa_id: str, massa_g: torch.Tensor) -> dict:
        """O ResumoCiclo (contrato) da estufa i."""
        p = max(self.passos, 1)
        return {
            "estufaId": estufa_id,
            "massaPorPe": round(float(massa_g[i]), 1),
            "energiaKwh": round(float(self.energia_kwh[i]), 2),
            "aguaL": round(float(self.agua_l[i]), 1),
            "nutrienteG": 0.0,  # a solução nutritiva só entra na Etapa 4
            "acidoMl": 0.0,
            "foraDaFaixa": round(float(self.fora_qualquer[i]) / p, 4),
            "foraPorVariavel": {v: round(float(c[i]) / p, 4) for v, c in self.fora.items()},
            "barradas": int(self.barradas[i]),
        }
