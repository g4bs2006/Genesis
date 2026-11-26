import type { ReactNode } from 'react'
import { HStack } from '@astryxdesign/core/HStack'
import { BarraAbas } from '../organisms/BarraAbas'
import { BotaoTema } from '../molecules/BotaoTema'
import type { ItemNavegacao } from './tipos'
import css from './CascaCelular.module.css'

/**
 * Moldura do celular: conteúdo rolando e as abas presas embaixo. No topo, o
 * seletor de modo (vem do app) e o sol/lua, à vista em toda página.
 */
export function CascaCelular({
  abas,
  topo,
  children,
}: {
  abas: ItemNavegacao[]
  /** à esquerda do sol/lua (o seletor de modo) */
  topo?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <main className={`${css.casca} conteudo-pagina`}>
        <HStack justify="between" align="center" gap={3} paddingBlockStart={2}>
          {topo}
          <BotaoTema tamanho="lg" />
        </HStack>
        {children}
      </main>
      <BarraAbas itens={abas} />
    </>
  )
}
