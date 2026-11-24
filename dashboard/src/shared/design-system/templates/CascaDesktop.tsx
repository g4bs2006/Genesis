import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AppShell } from '@astryxdesign/core/AppShell'
import { VStack } from '@astryxdesign/core/VStack'
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { Broto } from '../atoms/Marca'
import { rotaAtiva, type ItemNavegacao } from './tipos'

type Props = {
  itens: ItemNavegacao[]
  /** Blocos extras na barra (lista de estufas, card "Treino rodando") */
  extras?: ReactNode
  /** Rodapé da barra: o seletor de modo */
  rodape: ReactNode
  children: ReactNode
}

/**
 * Moldura do desktop: barra lateral à esquerda, conteúdo à direita.
 * Componente "template" no atomic design: só arruma o espaço, não sabe de
 * estufa nem de treino. Quem decide os itens é o app (src/app/navegacao.ts).
 */
export function CascaDesktop({ itens, extras, rodape, children }: Props) {
  const { pathname } = useLocation()
  return (
    <AppShell
      variant="elevated"
      contentPadding={0}
      // o celular tem casca própria (abas embaixo); aqui nunca vira menu sanduíche
      mobileNav={false}
      sideNav={
        <SideNav header={<SideNavHeading heading="Genesis" headingHref="/" icon={<Broto />} />} footer={rodape}>
          <SideNavSection title="Navegação" isHeaderHidden>
            {itens.map((item) => (
              <SideNavItem
                key={item.rota}
                label={item.rotulo}
                href={item.rota}
                icon={item.icone}
                isSelected={rotaAtiva(item.rota, pathname)}
              />
            ))}
          </SideNavSection>
          {extras}
        </SideNav>
      }
    >
      {/* margem lateral é da casca; a página cuida só da vertical */}
      <VStack paddingInline={6}>{children}</VStack>
    </AppShell>
  )
}
