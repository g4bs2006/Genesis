"""
A camada de segurança: limites duros entre a decisão e o atuador.

Nenhum controlador, nem a rede, passa por cima dela. Na estufa física ela
impede a ação perigosa. No simulador ela faz o MESMO (corta a ação) e anota a
tentativa como AcaoBarrada, para o treino viver as mesmas regras que o hardware
e para a tela mostrar "a segurança barrou". Cada barrada custa um pouco na nota
(controle/metricas.py), para a rede aprender a não depender dela.
"""

import torch

from simulador.parametros import Adaptacao

_AD = Adaptacao()

# Potência elétrica de cada atuador no máximo, em W por m² de piso.
# Ordem de grandeza com a conta à vista (docs/decisoes/0005-controle-e-nota.md):
POTENCIA_W_M2 = {
    # 0,041 m³/s/m² de ar a ~20 cfm/W (≈ 0,0094 m³/s/W), eficiência típica de exaustor de estufa
    "exaustor": _AD.ventilacao_max / 0.0094,
    # bomba de névoa: 70 bar × vazão de 8,9 g/m²/min, com 50% de eficiência
    "nebulizacao": 70e5 * (_AD.nebulizacao_max / 1000) / 0.5,
    "sombreamento": 0.0,  # o motor da tela só gasta para abrir e fechar: desprezível
    "luz": _AD.lampada_w,
}
# SUPOSIÇÃO (não há projeto elétrico ainda): o circuito aguenta o LED inteiro
# com folga pequena, mas não LED + exaustor + névoa no máximo ao mesmo tempo.
POTENCIA_DISPONIVEL_W_M2 = 82.0
# Acima disto a névoa não evapora direito: molha a folha e favorece fungo.
UMIDADE_MAXIMA_NEVOA = 90.0

MOTIVOS = {
    "nebulizacao": f"umidade acima de {UMIDADE_MAXIMA_NEVOA:.0f}%: a névoa molharia as folhas",
    "luz": f"potência acima de {POTENCIA_DISPONIVEL_W_M2:.0f} W/m²: o LED foi reduzido",
}


class Seguranca:
    def filtrar(self, acoes: dict, obs: dict) -> tuple[dict, dict]:
        """
        Devolve (ações seguras, barradas). `barradas` diz, por atuador, em quais
        estufas a ação foi cortada (tensor de True/False [N]).
        """
        ur = obs["ar"]["umidade"]
        zero = torch.zeros_like(ur)
        seguras = {k: zero + torch.as_tensor(v, dtype=ur.dtype) for k, v in acoes.items()}
        for k in POTENCIA_W_M2:
            seguras.setdefault(k, zero.clone())
        barradas = {}

        # 1. Névoa com o ar já úmido demais.
        nevoa = (seguras["nebulizacao"] > 0) & (ur > UMIDADE_MAXIMA_NEVOA)
        seguras["nebulizacao"] = torch.where(nevoa, zero, seguras["nebulizacao"])
        barradas["nebulizacao"] = nevoa

        # 2. Potência total acima do disponível: reduz o LED, o menos urgente
        # (resfriar protege a alface; luz extra só acelera um pouco).
        potencia = sum(seguras[k].clamp(0, 1) * w for k, w in POTENCIA_W_M2.items())
        excesso = (potencia - POTENCIA_DISPONIVEL_W_M2).clamp(min=0)
        luz = (seguras["luz"] - excesso / POTENCIA_W_M2["luz"]).clamp(min=0)
        barradas["luz"] = excesso > 1e-6
        seguras["luz"] = torch.where(barradas["luz"], luz, seguras["luz"])
        return seguras, barradas


def lista_barradas(i: int, pedidas: dict, barradas: dict) -> list[dict]:
    """As AcaoBarrada (contrato) da estufa i, para gravar num Passo."""
    def pedido(k: str) -> float:
        v = torch.as_tensor(pedidas.get(k, 0.0)).reshape(-1)
        return round(float(v[0] if v.numel() == 1 else v[i]), 3)

    return [{"atuador": k, "pedido": pedido(k), "motivo": MOTIVOS[k]} for k, m in barradas.items() if bool(m[i])]
