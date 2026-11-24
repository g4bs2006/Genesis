import { useState } from 'react'
import { alertaPrincipal, type Alerta, type Passo } from '@/modules/estufa'

const MS_PARA_ESCONDER = 10_000

type Estado = { instante?: string; aberto: boolean; limpoDesde?: number; ultimo: Alerta | null }

/**
 * Histerese do alerta: abre se o problema está nos dois últimos passos (olhando
 * o histórico, então já abre ao carregar) e só fecha 10 s do relógio da estufa
 * depois de resolvido. O texto é sempre o do passo atual; `ultimo` guarda o
 * último alerta para o card continuar na tela enquanto fecha (a animação).
 */
export function useAlertaEstavel(passos: Passo[]): { aberto: boolean; ultimo: Alerta | null } {
  const agora = alertaPrincipal(passos)
  const confirmado = agora && alertaPrincipal(passos.slice(0, -1)) ? agora : null
  const instante = passos.at(-1)?.leitura.instante
  const [estado, setEstado] = useState<Estado>({ aberto: false, ultimo: null })
  // atualiza uma vez por passo novo, durante a renderização (sem efeito)
  if (instante && instante !== estado.instante) {
    const t = new Date(instante).getTime()
    if (confirmado) setEstado({ instante, aberto: true, ultimo: confirmado })
    else if (estado.aberto && !agora) {
      const limpoDesde = estado.limpoDesde ?? t
      setEstado({ ...estado, instante, limpoDesde, aberto: t - limpoDesde < MS_PARA_ESCONDER })
    } else setEstado({ ...estado, instante, ultimo: agora ?? estado.ultimo })
  }
  return { aberto: !!confirmado || estado.aberto, ultimo: confirmado ?? agora ?? estado.ultimo }
}
