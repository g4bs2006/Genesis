"""
A estufa simulada: o modelo de Van Henten (1994) adaptado ao Genesis.

VETORIZADO: a classe não simula uma estufa, simula N de uma vez. Cada variável
é um tensor de tamanho [N] (um tensor é uma tabela de números do PyTorch, como
o array do NumPy no estudo): temperatura[0] é a estufa 0, temperatura[1] a
estufa 1... Um passo é uma conta só sobre a tabela inteira. Assim mil redes
cultivam mil estufas ao mesmo tempo.

O modelo tem 4 ESTADOS, o que a estufa "lembra" de um instante para o outro:
  massa   (x1) massa seca de alface por m² de piso   kg/m²
  co2     (x2) CO2 do ar de dentro                    kg/m³
  temperatura (x3) do ar de dentro                    °C
  umidade (x4) vapor d'água no ar de dentro           kg/m³ (umidade absoluta)

Cada estado muda conforme uma equação diferencial: uma regra que diz "a
temperatura está subindo X graus por segundo agora". INTEGRAR é somar essas
mudanças aos poucos: anda 60 s com a taxa de agora, recalcula a taxa, anda mais
60 s... (método de Euler). Dez sub-passos de 1 min dão um passo de 10 min.
Passos menores erram menos; passos grandes demais fazem a conta "explodir".

Interface do plano: ler_sensores() devolve o que os sensores mostram (nomes do
contrato, docs/contrato-dados.md) e acionar(acoes) recebe as 8 ações.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import torch

from simulador.clima import MINUTOS_POR_PASSO, PASSOS_POR_DIA, Clima
from simulador.parametros import CALIBRADO, M_CO2, PRESSAO, R, Adaptacao, VanHenten

ATUADORES = (
    "exaustor",
    "sombreamento",
    "nebulizacao",
    "luz",
    "dosagemAB",
    "dosagemAcido",
    "reposicaoAgua",
    "bomba",
)
# Fase 1: só o ar. Os atuadores da solução existem, mas ainda não fazem nada.
DO_AR = ("exaustor", "sombreamento", "nebulizacao", "luz")

# Solução nutritiva fixa no meio da faixa boa do dashboard (estufa/domain/faixas.ts)
# até a Etapa 4 do plano. Vai marcada como "exemplo" na leitura.
SOLUCAO_FIXA = {"ph": 6.0, "ec": 1.5, "temperaturaAgua": 21.0, "nivel": 0.8}
TARIFA_KWH = 1.28  # R$/kWh com impostos, Equatorial Goiás (decisão 0009); a fase 1 treinou com 0,85
FUSO = timezone(timedelta(hours=-3))  # America/Sao_Paulo, sem horário de verão


# ---------------------------------------------------------------------------
# Conversões entre o que o modelo usa e o que um sensor mostra
# ---------------------------------------------------------------------------

def _densidade_vapor_saturado(t: torch.Tensor) -> torch.Tensor:
    """Vapor que cabe no ar a t °C (kg/m³): 611 Pa·exp(...) × 0,018 kg/mol ÷ R·T ≈ 11·exp(...) ÷ R·T."""
    return 11.0 * torch.exp(17.269 * t / (t + 238.3)) / (R * (t + 273.15))


def umidade_relativa(umidade_abs: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
    """Umidade absoluta (kg/m³) para relativa (0..1): quanto do vapor possível já está no ar."""
    return umidade_abs / _densidade_vapor_saturado(t)


def umidade_absoluta(ur_pct: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
    """Umidade relativa (%) para absoluta (kg/m³)."""
    return ur_pct / 100 * _densidade_vapor_saturado(t)


def co2_ppm(co2_kg: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
    """CO2 em kg/m³ para ppm (partes por milhão em volume), pela lei dos gases."""
    return co2_kg * R * (t + 273.15) / (PRESSAO * M_CO2) * 1e6


def co2_kg(ppm: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
    """CO2 em ppm para kg/m³."""
    return ppm / 1e6 * PRESSAO * M_CO2 / (R * (t + 273.15))


def vpd_kpa(t: torch.Tensor, ur: torch.Tensor) -> torch.Tensor:
    """
    VPD, a "sede do ar" (kPa): quanto vapor ainda falta para o ar saturar.
    Pressão de saturação pela fórmula de Tetens (a do FAO-56).
    """
    return 0.6108 * torch.exp(17.27 * t / (t + 237.3)) * (1 - ur.clamp(0, 1))


# ---------------------------------------------------------------------------
# A estufa
# ---------------------------------------------------------------------------

class Estufa:
    def __init__(
        self,
        n: int,
        clima: Clima,
        vh: VanHenten = CALIBRADO,  # VanHenten() para o modelo original, sem calibração
        ad: Adaptacao = Adaptacao(),
        sub_passos: int = 10,
        inicio: datetime = datetime(2026, 10, 1, tzinfo=FUSO),
    ):
        self.n, self.clima, self.vh, self.ad = n, clima, vh, ad
        self.sub_passos = sub_passos
        self.inicio = inicio
        self.passo = 0
        device = clima.temperatura.device
        zero = torch.zeros(n, device=device)
        t0 = clima.temperatura[0]
        if t0.dim() == 1 and t0.shape[0] != n:
            raise ValueError(f"O clima tem {t0.shape[0]} estufas; pediram {n}.")
        # Começa como o ar de fora, com as mudas recém-transplantadas.
        self.massa = zero + ad.massa_inicial
        self.co2 = zero + co2_kg(clima.co2[0], t0)
        self.temperatura = zero + t0
        self.umidade = zero + umidade_absoluta(clima.umidade[0], t0)
        self._acoes = {k: zero.clone() for k in ATUADORES}

    # ----- o tempo -----

    @property
    def fim(self) -> bool:
        return self.passo >= len(self.clima)

    @property
    def instante(self) -> datetime:
        return self.inicio + timedelta(minutes=MINUTOS_POR_PASSO * self.passo)

    def _fora(self):
        """O clima de fora agora (no último passo, repete o último valor)."""
        p = min(self.passo, len(self.clima) - 1)
        c = self.clima
        return c.temperatura[p], c.umidade[p], c.radiacao[p], c.co2[p]

    # ----- a física -----

    def acionar(self, acoes: dict) -> None:
        """
        Aplica as ações por 10 minutos e avança o relógio. `acoes` tem os nomes
        do contrato; cada valor é um número ou um tensor [N], de 0 a 1. Ação que
        não vier conta como 0 (desligado).
        """
        if self.fim:
            raise RuntimeError("O ciclo acabou: o clima não tem mais passos.")
        desconhecidas = set(acoes) - set(ATUADORES)
        if desconhecidas:
            raise KeyError(f"Atuadores que não existem: {sorted(desconhecidas)}")
        zero = torch.zeros(self.n, device=self.massa.device)
        a = {k: (zero + torch.as_tensor(acoes.get(k, 0.0), dtype=zero.dtype, device=zero.device)).clamp(0, 1)
             for k in ATUADORES}
        self._acoes = a

        vh, ad = self.vh, self.ad
        t_fora, ur_fora, rad_fora, co2_fora = self._fora()
        co2_fora_kg = co2_kg(co2_fora, t_fora)
        umid_fora = umidade_absoluta(ur_fora, t_fora)

        # Tela de sombra: corta parte do sol que entra.
        sol = rad_fora * (1 - a["sombreamento"] * ad.sombra_max)
        # LED: a luz útil dele vira "radiação equivalente" para a fotossíntese
        # (Van Henten mede luz em W/m² de radiação global) ...
        led_w = a["luz"] * ad.lampada_w
        led_par = led_w * ad.lampada_eficacia
        rad = sol + led_par / ad.par_por_w_global
        # ... e a parte da eletricidade que não vira luz esquenta o ar direto.
        led_calor = led_w * (1 - ad.lampada_eficacia / ad.par_por_w_par)
        ventilacao = a["exaustor"] * ad.ventilacao_max  # m³ de ar trocado por m² por s
        nevoa = a["nebulizacao"] * ad.nebulizacao_max  # kg de água por m² por s

        dt = MINUTOS_POR_PASSO * 60 / self.sub_passos
        x1, x2, x3, x4 = self.massa, self.co2, self.temperatura, self.umidade
        for _ in range(self.sub_passos):
            folhas = 1 - torch.exp(-vh.c_pl_d * x1)  # quanto do chão as folhas cobrem
            # Fotossíntese: limitada pela luz OU pelo CO2, o que faltar mais.
            luz = vh.c_rad_phot * rad
            # O efeito da temperatura é uma parábola com pico em ~22,5 °C. Ela fica
            # negativa abaixo de ~3 °C e acima de ~42 °C; cortamos em 0 para a
            # fotossíntese não virar "anti-fotossíntese" fora da faixa do modelo.
            gas = (-vh.c_co2_1 * x3**2 + vh.c_co2_2 * x3 - vh.c_co2_3).clamp(min=0) * (x2 - vh.c_gama).clamp(min=0)
            soma = luz + gas
            fotossintese = folhas * torch.where(soma > 0, luz * gas / soma.clamp(min=1e-30), torch.zeros_like(soma))
            respiracao = x1 * 2 ** (x3 / 10 - 2.5)  # dobra a cada 10 °C a mais

            # Nebulização: a água só evapora se o ar tiver espaço para o vapor.
            # Com o ar a 100%, a névoa não esfria nem umedece mais nada.
            nevoa_evapora = nevoa * (1 - umidade_relativa(x4, x3)).clamp(0, 1)

            transpiracao = vh.c_v_pl_ai * folhas * (
                vh.c_v_1 / (vh.c_v_2 * (x3 + vh.c_v_3)) * torch.exp(vh.c_v_4 * x3 / (x3 + vh.c_v_5)) - x4
            )
            troca = ventilacao + vh.c_vazamento  # o ar que sai, pelas frestas ou pelo exaustor

            d_massa = vh.c_alfa_beta * fotossintese - vh.c_resp_d * respiracao
            d_co2 = (-fotossintese + vh.c_resp_c * respiracao - troca * (x2 - co2_fora_kg)) / vh.c_cap_c
            d_temp = (
                -(vh.c_cap_q_v * ventilacao + vh.c_ai_ou) * (x3 - t_fora)
                + vh.c_rad_alfa * rad
                + led_calor
                - ad.calor_latente * nevoa_evapora
            ) / vh.c_cap_q
            d_umid = (transpiracao - troca * (x4 - umid_fora) + nevoa_evapora) / vh.c_cap_h

            x1 = (x1 + dt * d_massa).clamp(min=0)
            x2 = (x2 + dt * d_co2).clamp(min=0)
            x3 = x3 + dt * d_temp
            x4 = (x4 + dt * d_umid).clamp(min=0)

        self.massa, self.co2, self.temperatura, self.umidade = x1, x2, x3, x4
        self.passo += 1

    # ----- o que os sensores mostram -----

    @property
    def massa_por_pe(self) -> torch.Tensor:
        """Massa FRESCA por pé, em gramas: a que vai para a balança na colheita."""
        return self.massa * 1000 / self.ad.materia_seca / self.ad.pes_por_m2

    def ler_sensores(self) -> dict:
        """
        As leituras de agora, com os nomes do contrato (Leitura), cada valor um
        tensor [N]. A solução nutritiva ainda é fixa (fase 1).
        """
        ad, a = self.ad, self._acoes
        t_fora, ur_fora, rad_fora, _ = self._fora()
        hora = self.clima.hora[min(self.passo, len(self.clima) - 1)]
        ur = umidade_relativa(self.umidade, self.temperatura)
        um = torch.ones(self.n, device=self.massa.device)
        luz = rad_fora * ad.transmissao * (1 - a["sombreamento"] * ad.sombra_max) * ad.par_por_w_global
        luz = luz + a["luz"] * ad.lampada_w * ad.lampada_eficacia
        return {
            "ar": {
                "temperatura": self.temperatura,
                "umidade": (ur * 100).clamp(0, 100),
                "vpd": vpd_kpa(self.temperatura, ur),
                "co2": co2_ppm(self.co2, self.temperatura),
                "luz": luz,
            },
            "solucao": {k: um * v for k, v in SOLUCAO_FIXA.items()},
            "fora": {"temperatura": um * t_fora, "umidade": um * ur_fora, "radiacao": um * rad_fora},
            "tarifaKwh": um * TARIFA_KWH,
            # fora do contrato (a Leitura tem o instante): o relógio que a rede precisa
            "tempo": {"hora": um * hora, "diaDoCiclo": um * (self.passo / PASSOS_POR_DIA)},
        }

    def leitura(self, i: int, estufa_id: str) -> dict:
        """A leitura da estufa i como um Leitura do contrato (números comuns, pronto para JSON)."""
        s = self.ler_sensores()
        return {
            "estufaId": estufa_id,
            "instante": self.instante.isoformat(timespec="seconds"),
            "ar": {k: round(float(v[i]), 3) for k, v in s["ar"].items()},
            "solucao": {k: round(float(v[i]), 3) for k, v in s["solucao"].items()},
            "fora": {k: round(float(v[i]), 3) for k, v in s["fora"].items()},
            "tarifaKwh": round(float(s["tarifaKwh"][i]), 4),
            "exemplos": [f"solucao.{k}" for k in SOLUCAO_FIXA],
        }
