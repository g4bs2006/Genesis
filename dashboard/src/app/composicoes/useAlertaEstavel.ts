import { useState } from 'react'
import { alertaPrincipal, type Alerta, type Passo } from '@/modules/estufa'

const MS_PARA_ESCONDER = 10_000

/**
 * Histerese do alerta: só aparece se o problema está nos dois últimos passos
 * (olhando o histórico, então já aparece ao abrir a página), e só some 10 s
 * do relógio da estufa depois de resolvido. Assim não pisca na beira da faixa.
 */
export function useAlertaEstavel(passos: Passo[]): Alerta | null {
  const agora = alertaPrincipal(passos)
  const antes = alertaPrincipal(passos.slice(0, -1))
  const confirmado = agora && antes ? agora : null
  const instante = passos.at(-1)?.leitura.instante
  const [estado, setEstado] = useState<{ instante?: string; mostrado: Alerta | null; limpoDesde?: number }>({
    mostrado: null,
  })
  // atualiza uma vez por passo novo, durante a renderização (sem efeito)
  if (instante && instante !== estado.instante) {
    const t = new Date(instante).getTime()
    if (confirmado) setEstado({ instante, mostrado: confirmado })
    else if (estado.mostrado && !agora) {
      const limpoDesde = estado.limpoDesde ?? t
      setEstado({ instante, mostrado: t - limpoDesde >= MS_PARA_ESCONDER ? null : estado.mostrado, limpoDesde })
    } else setEstado({ ...estado, instante })
  }
  return confirmado ?? estado.mostrado
}
