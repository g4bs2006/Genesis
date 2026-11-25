"""
Testes do controle. Rode na raiz do repositório:

    .venv\\Scripts\\python.exe -m pytest controle
"""

import torch

from controle.ciclo import simular_ciclo
from controle.controladores import PID, Nada, RegrasFixas
from controle.metricas import FAIXAS, Medidor, fator_peso
from controle.seguranca import POTENCIA_DISPONIVEL_W_M2, POTENCIA_W_M2, Seguranca, lista_barradas
from simulador.clima import clima_ameno
from simulador.estufa import Estufa


def obs_com(temperatura=22.0, umidade=70.0, vpd=0.85, co2=700.0, n=1):
    um = torch.ones(n)
    return {"ar": {"temperatura": um * temperatura, "umidade": um * umidade, "vpd": um * vpd, "co2": um * co2}}


def test_seguranca_barra_nevoa_com_ar_umido():
    obs = obs_com(umidade=torch.tensor([70.0, 95.0]), n=2)
    seguras, barradas = Seguranca().filtrar({"nebulizacao": torch.tensor([1.0, 1.0])}, obs)
    assert seguras["nebulizacao"].tolist() == [1.0, 0.0]
    assert barradas["nebulizacao"].tolist() == [False, True]
    [b] = lista_barradas(1, {"nebulizacao": torch.tensor([1.0, 1.0])}, barradas)
    assert b["atuador"] == "nebulizacao" and b["pedido"] == 1.0 and "umidade" in b["motivo"]


def test_seguranca_corta_o_led_quando_falta_potencia():
    tudo = {"exaustor": 1.0, "nebulizacao": 1.0, "luz": 1.0}
    seguras, barradas = Seguranca().filtrar(tudo, obs_com())
    total = sum(float(seguras[k][0]) * w for k, w in POTENCIA_W_M2.items())
    assert total <= POTENCIA_DISPONIVEL_W_M2 + 1e-3
    assert bool(barradas["luz"][0]) and float(seguras["luz"][0]) < 1
    assert float(seguras["exaustor"][0]) == 1 and float(seguras["nebulizacao"][0]) == 1  # resfriar vem primeiro
    # só o LED cabe: nada é barrado
    _, barradas = Seguranca().filtrar({"luz": 1.0}, obs_com())
    assert not bool(barradas["luz"][0])


def test_punicao_comeca_no_meio_da_faixa():
    """Lição do estudo: viver colado na borda tem que custar mais que viver no meio."""
    lo, hi = FAIXAS["temperatura"]
    punicoes = []
    for t in ((lo + hi) / 2, hi - 0.5, hi + 1, hi + 3):
        m = Medidor(1)
        m.registrar(obs_com(temperatura=t), {}, {})
        punicoes.append(float(m.punicao[0]))
    assert punicoes[0] == 0
    assert punicoes[0] < punicoes[1] < punicoes[2] < punicoes[3]
    # fora da faixa a punição cresce bem mais rápido que dentro
    assert punicoes[2] - punicoes[1] > 5 * (punicoes[1] - punicoes[0])


def test_fator_peso_igual_ao_dashboard():
    f = fator_peso(torch.tensor([100.0, 150.0, 220.0, 300.0]))
    assert torch.allclose(f, torch.tensor([0.0, 150 / 220, 1.0, 1.1]))


def test_energia_do_exaustor_numa_hora():
    m = Medidor(1)
    for _ in range(6):  # 6 passos de 10 min
        m.registrar(obs_com(), {"exaustor": torch.ones(1)}, {})
    esperado = POTENCIA_W_M2["exaustor"] * m.area / 1000  # kWh em 1 h
    assert abs(float(m.energia_kwh[0]) - esperado) < 1e-4


def test_controladores_vencem_nao_fazer_nada():
    clima = clima_ameno(5, semente=4)
    notas = {}
    for ctrl in (Nada(), RegrasFixas(), PID()):
        e = Estufa(1, clima)
        notas[type(ctrl).__name__] = float(simular_ciclo(e, ctrl).nota(e.massa_por_pe)[0])
    assert notas["RegrasFixas"] > notas["Nada"] + 100
    assert notas["PID"] > notas["Nada"] + 100


def test_resumo_tem_o_formato_do_contrato():
    e = Estufa(2, clima_ameno(1, semente=2))
    m = simular_ciclo(e, RegrasFixas())
    r = m.resumo(1, "estufa-1", e.massa_por_pe)
    assert set(r) == {"estufaId", "massaPorPe", "energiaKwh", "aguaL", "nutrienteG", "acidoMl",
                      "foraDaFaixa", "foraPorVariavel", "barradas"}
    assert 0 <= r["foraDaFaixa"] <= 1 and all(0 <= v <= 1 for v in r["foraPorVariavel"].values())
