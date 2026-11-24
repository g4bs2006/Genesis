import type { ReactNode } from 'react'
import { BarraAbas } from '../organisms/BarraAbas'
import type { ItemNavegacao } from './tipos'
import css from './CascaCelular.module.css'

/** Moldura do celular: conteúdo rolando e as abas presas embaixo. */
export function CascaCelular({ abas, children }: { abas: ItemNavegacao[]; children: ReactNode }) {
  return (
    <>
      <main className={`${css.casca} conteudo-pagina`}>{children}</main>
      <BarraAbas itens={abas} />
    </>
  )
}
