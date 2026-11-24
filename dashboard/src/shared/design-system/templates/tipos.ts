import type { ComponentType, SVGProps } from 'react'

/** Um destino da navegação (aba no celular, item da barra lateral no desktop). */
export type ItemNavegacao = {
  rota: string
  rotulo: string
  icone: ComponentType<SVGProps<SVGSVGElement>>
  /** Versão cheia do ícone, para a aba ativa (Heroicons "solid") */
  iconeAtivo?: ComponentType<SVGProps<SVGSVGElement>>
}

/** A rota está ativa? "/" só casa com ela mesma; as outras casam com subrotas. */
export function rotaAtiva(rota: string, caminho: string): boolean {
  if (rota === '/' || rota === '/dev') return caminho === rota
  return caminho === rota || caminho.startsWith(`${rota}/`)
}
