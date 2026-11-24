import type { ReactNode } from 'react'
import { Theme } from '@astryxdesign/core/theme'
import { genesisTheme } from '../tema/genesis'
import css from './CascaVisor.module.css'

/**
 * Moldura do visor: a tela fixa na estufa (TV ou tablet). Sempre escura, para
 * não ofuscar e ler de longe; sem barra, sem botão, sem toque.
 * O <Theme> aninhado força o escuro só aqui, mesmo com o app no claro.
 */
export function CascaVisor({ children }: { children: ReactNode }) {
  return (
    <Theme theme={genesisTheme} mode="dark">
      <main className={css.visor}>{children}</main>
    </Theme>
  )
}
