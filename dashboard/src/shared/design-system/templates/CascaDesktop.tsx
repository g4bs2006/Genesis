import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AppShell } from '@astryxdesign/core/AppShell'
import { VStack } from '@astryxdesign/core/VStack'
import { SideNav, SideNavCollapseButton, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { Broto } from '../atoms/Marca'
import { rotaAtiva, type ItemNavegacao } from './tipos'

type Props = {
  itens: ItemNavegacao[]
  /** Blocos extras na barra (lista de estufas, card "Treino rodando") */
  extras?: ReactNode
  /** Rodapé da barra: o seletor de modo */
  rodape: ReactNode
  /** Botões de ícone do rodapé (sol/lua); ficam à vista também com a barra recolhida */
  icones?: ReactNode
  /** Barra recolhida numa faixa só de ícones (a escolha mora nas preferências) */
  recolhida: boolean
  aoRecolher: (recolhida: boolean) => void
  children: ReactNode
}

/**
 * Moldura do desktop: barra lateral à esquerda, conteúdo à direita.
 * Componente "template" no atomic design: só arruma o espaço, não sabe de
 * estufa nem de treino. Quem decide os itens é o app (src/app/navegacao.ts).
 */
export function CascaDesktop({ itens, extras, rodape, icones, recolhida, aoRecolher, children }: Props) {
  const { pathname } = useLocation()
  return (
    <AppShell
      variant="elevated"
      contentPadding={0}
      // o celular tem casca própria (abas embaixo); aqui nunca vira menu sanduíche
      mobileNav={false}
      sideNav={
        <SideNav
          header={<SideNavHeading heading="Genesis" headingHref="/" icon={<Broto />} />}
          // o botão embutido do Astryx fica no rodapé; o nosso vai no topo, à vista
          collapsible={{ isCollapsed: recolhida, onCollapsedChange: aoRecolher, hasButton: false }}
          topContent={<SideNavCollapseButton />}
          // recolhida, os blocos largos (seletor de modo, card do treino, lista
          // de estufas) somem: numa faixa de ícones eles só quebrariam o layout.
          // Ficam a um clique (abrir a barra) ou em Ajustes.
          footer={recolhida ? undefined : rodape}
          footerIcons={icones}
        >
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
          {!recolhida && extras}
        </SideNav>
      }
    >
      {/* margem lateral é da casca; a página cuida só da vertical */}
      <VStack paddingInline={6} className="conteudo-pagina">
        {children}
      </VStack>
    </AppShell>
  )
}
