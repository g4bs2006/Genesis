import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SideNavSection, SideNavItem } from '@astryxdesign/core/SideNav'
import { CascaCelular } from '@/shared/design-system/templates/CascaCelular'
import { CascaDesktop } from '@/shared/design-system/templates/CascaDesktop'
import { SeletorModo } from '@/shared/design-system/molecules/SeletorModo'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { usePreferencias, type Modo } from '@/shared/stores/preferencias'
import { navegacao } from './navegacao'

/**
 * Escolhe a casca (celular ou desktop) e os itens do modo atual.
 * `<Outlet />` é onde o React Router põe a página da rota aberta.
 */
export function Moldura() {
  const largo = useTelaLarga()
  const { modo, trocarModo } = usePreferencias()
  const navegar = useNavigate()
  const { pathname } = useLocation()

  // Abrir um link de outro modo (ex.: /dev/treino) troca o modo junto,
  // para a barra lateral não mostrar itens que não batem com a página.
  useEffect(() => {
    const modoDaRota: Modo | null = pathname.startsWith('/dev')
      ? 'desenvolvedor'
      : pathname === '/ajustes'
        ? null
        : 'produtor'
    if (modoDaRota && modoDaRota !== modo) trocarModo(modoDaRota)
  }, [pathname, modo, trocarModo])

  const aoTrocarModo = (novo: Modo) => {
    trocarModo(novo)
    navegar(novo === 'produtor' ? '/' : '/dev')
  }

  if (!largo) {
    return (
      <CascaCelular abas={navegacao[modo].celular}>
        <Outlet />
      </CascaCelular>
    )
  }

  return (
    <CascaDesktop
      itens={navegacao[modo].desktop}
      extras={modo === 'produtor' ? <ListaEstufas /> : null}
      rodape={<SeletorModo valor={modo} aoTrocar={aoTrocarModo} />}
    >
      <Outlet />
    </CascaDesktop>
  )
}

// shortcut: lista fixa até a Fase 1 ligar a FonteEstufa; depois vem das portas
function ListaEstufas() {
  return (
    <SideNavSection title="Estufas">
      <SideNavItem label="Estufa 1 · simulada" href="/" />
    </SideNavSection>
  )
}
