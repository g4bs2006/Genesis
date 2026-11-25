import type { ReactNode } from 'react'
import { HStack } from '@astryxdesign/core/HStack'
import { BarraAbas } from '../organisms/BarraAbas'
import { BotaoTema } from '../molecules/BotaoTema'
import type { ItemNavegacao } from './tipos'
import css from './CascaCelular.module.css'

/** Moldura do celular: conteúdo rolando e as abas presas embaixo. */
export function CascaCelular({ abas, children }: { abas: ItemNavegacao[]; children: ReactNode }) {
  return (
    <>
      <main className={`${css.casca} conteudo-pagina`}>
        {/* sol/lua no topo, à direita: à vista em toda página, sem ocupar uma aba */}
        <HStack justify="end" paddingBlockStart={2}>
          <BotaoTema tamanho="lg" />
        </HStack>
        {children}
      </main>
      <BarraAbas itens={abas} />
    </>
  )
}
