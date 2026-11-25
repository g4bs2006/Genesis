"""
Testes de sanidade do simulador: cada um confere uma coisa que a física de uma
estufa de verdade faz. Rode na raiz do repositório:

    .venv\\Scripts\\python.exe -m pytest simulador
"""

import torch

from simulador.clima import PASSOS_POR_DIA, Clima, clima_ameno
from simulador.estufa import ATUADORES, Estufa, co2_kg, co2_ppm, umidade_absoluta, umidade_relativa


def clima_fixo(passos=6, temperatura=20.0, umidade=60.0, radiacao=800.0, hora=12.0):
    """Um clima parado (o mesmo valor em todos os passos), para isolar um efeito."""
    def serie(v):
        return torch.full((passos,), v)
    return Clima(serie(temperatura), serie(umidade), serie(radiacao), serie(420.0), serie(hora))


def rodar(clima, acoes, n=1):
    e = Estufa(n, clima)
    while not e.fim:
        e.acionar(acoes)
    return e


def test_ao_sol_sem_atuadores_a_temperatura_sobe():
    e = rodar(clima_fixo(), {})
    assert float(e.temperatura[0]) > 20 + 3  # efeito estufa: 1 h de sol fechado esquenta bem


def test_exaustor_puxa_a_temperatura_para_a_de_fora():
    fechado = rodar(clima_fixo(), {})
    aberto = rodar(clima_fixo(), {"exaustor": 1.0})
    assert abs(float(aberto.temperatura[0]) - 20) < abs(float(fechado.temperatura[0]) - 20) / 2


def test_nebulizacao_esfria_e_umedece():
    seco = rodar(clima_fixo(umidade=40.0), {"exaustor": 0.3})
    nevoa = rodar(clima_fixo(umidade=40.0), {"exaustor": 0.3, "nebulizacao": 1.0})
    assert float(nevoa.temperatura[0]) < float(seco.temperatura[0]) - 1
    assert float(nevoa.umidade[0]) > float(seco.umidade[0])


def test_nebulizacao_nao_passa_de_100_por_cento():
    # Ar já quase saturado: a névoa não tem para onde evaporar.
    e = rodar(clima_fixo(passos=36, umidade=97.0, radiacao=0.0, hora=0.0), {"nebulizacao": 1.0})
    assert float(e.ler_sensores()["ar"]["umidade"][0]) <= 100
    assert float(umidade_relativa(e.umidade, e.temperatura)[0]) < 1.05


def test_mesma_semente_mesmo_resultado():
    a, b = clima_ameno(3, semente=7), clima_ameno(3, semente=7)
    assert torch.equal(a.temperatura, b.temperatura) and torch.equal(a.radiacao, b.radiacao)
    ea, eb = rodar(a, {"exaustor": 0.5}), rodar(b, {"exaustor": 0.5})
    assert torch.equal(ea.massa, eb.massa) and torch.equal(ea.temperatura, eb.temperatura)
    assert not torch.equal(clima_ameno(3, semente=8).temperatura, a.temperatura)


def test_uma_estufa_igual_a_estufa_zero_de_mil():
    """Vetorizar não pode mudar a conta: a estufa 0 de 1000 = a estufa sozinha."""
    clima = clima_ameno(1, semente=3)
    g = torch.Generator().manual_seed(0)
    acoes = torch.rand(PASSOS_POR_DIA, len(ATUADORES), 1000, generator=g)  # ações diferentes por estufa
    sozinha, mil = Estufa(1, clima), Estufa(1000, clima)
    for p in range(PASSOS_POR_DIA):
        sozinha.acionar({k: acoes[p, i, :1] for i, k in enumerate(ATUADORES)})
        mil.acionar({k: acoes[p, i] for i, k in enumerate(ATUADORES)})
    for nome in ("massa", "co2", "temperatura", "umidade"):
        x1, x1000 = getattr(sozinha, nome)[0], getattr(mil, nome)[0]
        # O processador pode usar instruções vetoriais (SIMD) diferentes para 1 e
        # para 1000 números, o que muda a última casa do float32. Tolerância mínima.
        assert torch.allclose(x1, x1000, rtol=1e-5, atol=0), nome
    assert torch.isfinite(mil.temperatura).all() and torch.isfinite(mil.massa).all()


def test_ciclo_de_35_dias_da_massa_plausivel():
    """
    Com um termostato simples, 35 dias dão alface de tamanho comercial; sem
    fazer nada, a estufa cozinha e a alface quase não cresce. A referência é
    Santos et al. 2023: 209 a 250 g por pé aos 30 dias. O Van Henten sem
    calibrar dá ~1,8 vez isso no sol daqui (decisão 0004), por isso a faixa
    aceita aqui é larga: o teste pega erro de ordem de grandeza, não de calibração.
    """
    clima = clima_ameno(35, semente=1)
    nada, termostato = Estufa(1, clima), Estufa(1, clima)
    while not nada.fim:
        nada.acionar({})
        t = termostato.ler_sensores()["ar"]["temperatura"]
        termostato.acionar({"exaustor": (t > 22).float()})
    assert 150 < float(termostato.massa_por_pe[0]) < 600
    assert float(nada.massa_por_pe[0]) < 50


def test_conversoes_vao_e_voltam():
    t = torch.tensor([10.0, 25.0, 35.0])
    assert torch.allclose(co2_ppm(co2_kg(torch.tensor(420.0), t), t), torch.tensor(420.0))
    assert torch.allclose(umidade_relativa(umidade_absoluta(torch.tensor(70.0), t), t) * 100, torch.tensor(70.0))
    # 420 ppm a 20 °C ≈ 7,6e-4 kg/m³ (lei dos gases)
    assert abs(float(co2_kg(torch.tensor(420.0), torch.tensor(20.0))) - 7.6e-4) < 0.1e-4


def test_leitura_tem_os_nomes_do_contrato():
    e = Estufa(2, clima_ameno(1, semente=1))
    e.acionar({"exaustor": 1.0})
    l = e.leitura(1, "estufa-1")
    assert set(l["ar"]) == {"temperatura", "umidade", "vpd", "co2", "luz"}
    assert set(l["solucao"]) == {"ph", "ec", "temperaturaAgua", "nivel"}
    assert set(l["fora"]) == {"temperatura", "umidade", "radiacao"}
    assert l["instante"] == "2026-10-01T00:10:00-03:00"
