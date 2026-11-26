"""
Testes do treino/nuvem.py sem internet: um Supabase "de mentira" que só anota o
que receberia. Rodar com:  python -m unittest treino.test_nuvem
"""

import json
import os
import tempfile
import time
import unittest
from pathlib import Path

from treino.nuvem import Sincronizador, escrever_json, passo_demo


class NuvemFalsa:
    def __init__(self):
        self.tabelas: dict[str, list] = {}
        self.arquivos: dict[str, bytes] = {}

    def gravar(self, tabela, linhas, chave):
        self.tabelas.setdefault(tabela, []).extend(linhas if isinstance(linhas, list) else [linhas])

    def enviar_arquivo(self, caminho, conteudo, cache_s=3600):
        self.arquivos[caminho] = conteudo


class TestSincronizador(unittest.TestCase):
    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp()) / "fase1-semente7"
        self.nuvem = NuvemFalsa()
        self.sinc = Sincronizador(self.pasta, self.nuvem)
        escrever_json(self.pasta / "config.json", {"populacao": 8})
        self.geracoes: list = []

    def test_espera_o_estado_antes_de_mandar_qualquer_coisa(self):
        escrever_json(self.pasta / "geracoes.json", [{"numero": 1}])
        self.assertEqual(self.sinc.uma_volta(), [])
        self.assertEqual(self.nuvem.tabelas, {})

    def test_manda_so_as_geracoes_novas(self):
        for n in range(1, 4):
            passo_demo(self.pasta, n, "2026-11-24T20:00:00-03:00", self.geracoes)
        self.sinc.uma_volta()
        self.assertEqual([g["numero"] for g in self.nuvem.tabelas["geracoes"]], [1, 2, 3])
        self.assertEqual(self.nuvem.tabelas["execucoes"][0]["id"], "fase1-semente7")

        # sem mudança, nada sai
        self.assertEqual(self.sinc.uma_volta(), [])

        time.sleep(0.01)  # garante outra data de modificação
        passo_demo(self.pasta, 4, "2026-11-24T20:00:00-03:00", self.geracoes)
        self.sinc.uma_volta()
        self.assertEqual([g["numero"] for g in self.nuvem.tabelas["geracoes"]], [1, 2, 3, 4])

    def test_gravacao_vai_para_o_storage_e_o_resumo_para_a_tabela(self):
        passo_demo(self.pasta, 1, "2026-11-24T20:00:00-03:00", self.geracoes)
        escrever_json(self.pasta / "gravacoes" / "g1.json", {"id": "g1", "passos": []})
        escrever_json(
            self.pasta / "gravacoes" / "indice.json",
            [{"id": "g1", "semente": 3, "modeloId": "m1", "titulo": "t", "criadaEm": "2026-11-24T20:00:00-03:00", "passos": 0}],
        )
        self.sinc.uma_volta()
        self.assertIn("fase1-semente7/g1.json", self.nuvem.arquivos)
        linha = self.nuvem.tabelas["gravacoes"][0]
        self.assertEqual((linha["modelo_id"], linha["arquivo"]), ("m1", "fase1-semente7/g1.json"))
        # o índice inteiro também vai, com os campos que a tabela não tem
        self.assertEqual(json.loads(self.nuvem.arquivos["fase1-semente7/indice.json"])[0]["id"], "g1")

    def test_pasta_do_treino_nao_apaga_o_que_a_reavaliacao_mandou(self):
        raiz = Path(tempfile.mkdtemp())
        pasta = raiz / "saidas" / "fase1-semente7"
        sinc = Sincronizador(pasta, self.nuvem)
        escrever_json(pasta / "config.json", {"populacao": 8})
        passo_demo(pasta, 1, "2026-11-24T20:00:00-03:00", [])
        resumo = {"id": "g1", "semente": 3, "modeloId": "m1", "titulo": "t", "criadaEm": "2026-11-24T20:00:00-03:00",
                  "passos": 0}
        escrever_json(pasta / "gravacoes" / "g1.json", {"id": "g1", "passos": []})
        escrever_json(pasta / "gravacoes" / "indice.json", [resumo])
        escrever_json(raiz / "reavaliacoes" / "fase1-semente7" / "gravacoes" / "indice.json", [resumo])
        feito = sinc.uma_volta()
        self.assertNotIn("fase1-semente7/g1.json", self.nuvem.arquivos)
        self.assertTrue(any("pulada" in f for f in feito))

    def test_pasta_de_reavaliacao_manda_so_gravacoes_e_o_indice_proprio(self):
        pasta = Path(tempfile.mkdtemp()) / "fase1-semente7"
        sinc = Sincronizador(pasta, self.nuvem, indice_na_nuvem="indice-reavaliacao.json")
        escrever_json(pasta / "gravacoes" / "g1.json", {"id": "g1", "passos": []})
        escrever_json(pasta / "gravacoes" / "indice.json", [{"id": "g1", "semente": 3, "modeloId": "regras-fixas",
                      "titulo": "Regras fixas", "criadaEm": "2026-11-24T20:00:00-03:00", "passos": 0,
                      "controlador": "regras", "geracao": None}])
        sinc.uma_volta()
        self.assertNotIn("execucoes", self.nuvem.tabelas)  # sem estado.json: a execução já existe
        self.assertIn("fase1-semente7/indice-reavaliacao.json", self.nuvem.arquivos)
        self.assertNotIn("fase1-semente7/indice.json", self.nuvem.arquivos)

    def test_treino_quieto_demais_vira_parado(self):
        passo_demo(self.pasta, 1, "2026-11-24T20:00:00-03:00", self.geracoes)
        self.sinc.uma_volta()
        self.assertTrue(self.nuvem.tabelas["execucoes"][-1]["estado"]["rodando"])
        # finge que o estado.json não muda há 20 min
        velho = time.time() - 20 * 60
        os.utime(self.pasta / "estado.json", (velho, velho))
        self.sinc.uma_volta()
        self.assertFalse(self.nuvem.tabelas["execucoes"][-1]["estado"]["rodando"])
        # e não fica mandando de novo a cada volta
        n = len(self.nuvem.tabelas["execucoes"])
        self.sinc.uma_volta()
        self.assertEqual(len(self.nuvem.tabelas["execucoes"]), n)


if __name__ == "__main__":
    unittest.main()
