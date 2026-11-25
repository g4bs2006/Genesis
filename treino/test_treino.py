"""
Testes da rede, da evolução e do laço de treino. Rode na raiz do repositório:

    .venv\\Scripts\\python.exe -m pytest treino
"""

import json
import math

import torch

from simulador.clima import clima_ameno
from simulador.estufa import Estufa
from treino.evolucao import Combinado, fatiar, proxima_geracao
from treino.rede import ARQUITETURA, ENTRADAS, SAIDAS, ControladorRede, n_pesos, normalizacao, pesos_iniciais, propagar
from treino.treinar import Execucao, main


def test_numero_de_pesos():
    assert n_pesos() == 20 * 32 + 32 + 32 * 32 + 32 + 32 * 8 + 8 == 1992
    assert len(ENTRADAS) == ARQUITETURA[0] and len(SAIDAS) == ARQUITETURA[-1]


def test_propagar_igual_a_conta_do_dashboard():
    """A mesma conta neurônio a neurônio do rede.ts (pesos[i * saidas + j]), para uma rede."""
    g = torch.Generator().manual_seed(1)
    pesos = pesos_iniciais(3, g) + torch.randn(3, n_pesos(), generator=g) * 0.1
    x = torch.randn(3, 20, generator=g)
    rapido = propagar(pesos, x)
    w, inicio, a = pesos[1].tolist(), 0, x[1].tolist()
    for c, (ent, sai) in enumerate(zip(ARQUITETURA[:-1], ARQUITETURA[1:])):
        m, inicio = w[inicio:inicio + ent * sai], inicio + ent * sai
        v, inicio = w[inicio:inicio + sai], inicio + sai
        somas = [v[j] + sum(a[i] * m[i * sai + j] for i in range(ent)) for j in range(sai)]
        ultima = c == len(ARQUITETURA) - 2
        a = [1 / (1 + math.exp(-s)) if ultima else math.tanh(s) for s in somas]
    assert torch.allclose(rapido[1], torch.tensor(a), atol=1e-5)


def test_redes_novas_nascem_com_atuadores_quase_desligados():
    g = torch.Generator().manual_seed(4)
    saidas = propagar(pesos_iniciais(200, g), torch.randn(200, 20, generator=g))
    assert 0.08 < float(saidas.mean()) < 0.2  # ~sigmoide(−2) = 0,12, e não 0,5


def test_evolucao_guarda_a_elite_e_o_tamanho():
    g = torch.Generator().manual_seed(2)
    pop = torch.randn(40, 5, generator=g)
    notas = torch.arange(40.0)  # a última é a melhor
    nova = proxima_geracao(pop, notas, g, elite=0.05, torneio=3, sigma=0.1)
    assert nova.shape == pop.shape
    assert torch.equal(nova[0], pop[39]) and torch.equal(nova[1], pop[38])  # elite intacta, em ordem


def test_controlador_rede_e_combinado():
    g = torch.Generator().manual_seed(3)
    e = Estufa(5, clima_ameno(1, semente=1))
    ctrl = Combinado((ControladorRede(pesos_iniciais(3, g)), 3), (ControladorRede(pesos_iniciais(2, g)), 2))
    for _ in range(8):  # passa de uma hora: a tendência começa a valer
        obs = e.ler_sensores()
        acoes = ctrl.decidir(obs)
        e.acionar(acoes)
    assert set(acoes) == set(SAIDAS)
    assert all(v.shape == (5,) and bool(((v >= 0) & (v <= 1)).all()) for v in acoes.values())
    x = ctrl.partes[0][0].entradas(fatiar(e.ler_sensores(), 0, 3))
    assert x.shape == (3, 20) and bool((x.abs() <= 2).all())
    assert [n["id"] for n in normalizacao()] == [n for n, *_ in ENTRADAS]


def test_treino_curto_escreve_os_arquivos_do_contrato(tmp_path):
    main(["--populacao", "6", "--dias", "1", "--geracoes", "2", "--prova-cada", "2", "--horas", "1",
          "--saidas", str(tmp_path)])
    [pasta] = list(tmp_path.iterdir())
    ler = lambda nome: json.loads((pasta / nome).read_text(encoding="utf-8"))
    estado, geracoes = ler("estado.json"), ler("geracoes.json")
    assert estado["rodando"] is False and estado["geracaoAtual"] == 2
    assert [g["numero"] for g in geracoes] == [1, 2]
    assert set(ler("config.json")) == {"populacao", "elite", "torneio", "mutacao", "misturaFases", "arquitetura", "passoMinutos"}
    [modelo] = list((pasta / "modelos").glob("*.json"))
    m = json.loads(modelo.read_text(encoding="utf-8"))
    assert len(m["pesos"]) == 1992 and 0 <= m["provaPorFase"]["1"] <= 1
    [resumo] = ler("gravacoes/indice.json")
    grav = ler(f"gravacoes/{resumo['id']}.json")
    assert resumo["passos"] == len(grav["passos"]) == 144
    passo = grav["passos"][0]
    assert set(passo) == {"leitura", "acoes", "barradas"} and isinstance(passo["acoes"]["bomba"], bool)
    # retomar continua da geração 2
    assert Execucao.retomar(pasta).geracao == 2
