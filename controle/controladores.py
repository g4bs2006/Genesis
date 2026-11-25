"""
Os controladores de comparação: quem decide as ações quando não é a rede.

Todos seguem a mesma interface (a do plano): decidir(observacao) -> acoes.
  observacao: o que Estufa.ler_sensores() devolve (tensores [N])
  acoes: dicionário com os nomes do contrato, cada valor um tensor [N] de 0 a 1

A rede neural da Fase D vai ser só mais um controlador com essa interface. Assim
a comparação é justa: mesma estufa, mesmo clima, mesma segurança, mesma nota.
"""

import torch

from simulador.clima import MINUTOS_POR_PASSO


class Nada:
    """Não liga nada. É o piso: mostra quanto a estufa sofre sozinha."""

    def decidir(self, obs: dict) -> dict:
        return {}


class RegrasFixas:
    """
    Como a maioria das estufas funciona hoje: termostato e umidostato.
    É a régua que o agente precisa vencer (no estudo era só o termostato).
    """

    def decidir(self, obs: dict) -> dict:
        t, ur = obs["ar"]["temperatura"], obs["ar"]["umidade"]
        return {
            # passou de 24 °C (ou o ar ficou úmido demais), liga o exaustor
            "exaustor": ((t > 24) | (ur > 85)).float(),
            # passou de 26 °C e o ar ainda aceita vapor, liga a nebulização
            "nebulizacao": ((t > 26) & (ur < 80)).float(),
            # calor forte: fecha a tela de sombra
            "sombreamento": (t > 27).float(),
        }


class PID:
    """
    Controle PID da temperatura, o clássico da indústria.

    A saída é uma "demanda de resfriamento" de 0 a 2, dividida em faixas
    (split range): de 0 a 1 é o exaustor, de 1 a 2 entra a nebulização.

      P (proporcional): quanto mais quente, mais resfria agora.
      I (integral): se o calor insiste, a soma do erro vai crescendo e o
        resfriamento aumenta até o erro sumir.
      D (derivativo): reage à velocidade da mudança. Fica em ZERO aqui: com
        passo de 10 min a derivada só amplifica oscilação. Na prática muito
        "PID" de estufa é um PI.
    """

    def __init__(self, alvo: float = 22.0, kp: float = 0.4, ti_s: float = 1800.0, kd: float = 0.0):
        self.alvo, self.kp, self.ti_s, self.kd = alvo, kp, ti_s, kd
        self.dt = MINUTOS_POR_PASSO * 60
        self.integral = None  # soma do erro × tempo, uma por estufa
        self.erro_antes = None

    def reiniciar(self) -> None:
        self.integral = self.erro_antes = None

    def decidir(self, obs: dict) -> dict:
        t = obs["ar"]["temperatura"]
        erro = t - self.alvo  # positivo: está quente demais
        if self.integral is None:
            self.integral = torch.zeros_like(t)
            self.erro_antes = erro.clone()
        integral = self.integral + erro * self.dt
        derivada = (erro - self.erro_antes) / self.dt
        demanda = self.kp * (erro + integral / self.ti_s) + self.kd * derivada
        # Anti-windup: se a saída já está no limite, não acumula mais integral.
        # Sem isso, depois de uma noite fria a integral fica tão negativa que o
        # exaustor demora horas para ligar quando o sol chega.
        saturou = (demanda > 2) | (demanda < 0)
        self.integral = torch.where(saturou, self.integral, integral)
        self.erro_antes = erro
        demanda = demanda.clamp(0, 2)
        return {"exaustor": demanda.clamp(0, 1), "nebulizacao": (demanda - 1).clamp(0, 1)}
