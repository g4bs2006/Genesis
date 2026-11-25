"""
Um ciclo inteiro: sensores → controlador → segurança → atuadores → métricas,
a cada passo de 10 minutos, até o clima acabar.
"""

from controle.metricas import Medidor
from controle.seguranca import Seguranca
from simulador.estufa import Estufa


def simular_ciclo(estufa: Estufa, controlador, seguranca: Seguranca = Seguranca()) -> Medidor:
    if hasattr(controlador, "reiniciar"):
        controlador.reiniciar()
    medidor = Medidor(estufa.n, estufa.ad)
    while not estufa.fim:
        obs = estufa.ler_sensores()
        acoes, barradas = seguranca.filtrar(controlador.decidir(obs), obs)
        estufa.acionar(acoes)
        medidor.registrar(obs, acoes, barradas)
    return medidor
