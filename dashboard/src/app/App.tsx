import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, Link as LinkRouter } from 'react-router-dom'
import type { ComponentProps } from 'react'
import { LinkProvider } from '@astryxdesign/core/Link'
import { Theme } from '@astryxdesign/core/theme'
import { genesisTheme } from '@/shared/design-system/tema/genesis'
import { modoDoTema, usePreferencias } from '@/shared/stores/preferencias'
import { roteador } from './rotas'

// React Query: cuida das leituras assíncronas (buscar, guardar em cache,
// buscar de novo). Uma instância só para o app inteiro.
const clienteConsultas = new QueryClient()

// Os links do Astryx (SideNavItem, Button com href) passam pelo roteador:
// trocar de página não recarrega o app inteiro.
function LinkRota({ href, ...resto }: Omit<ComponentProps<typeof LinkRouter>, 'to'> & { href: string }) {
  return <LinkRouter to={href} {...resto} />
}

export function App() {
  const tema = usePreferencias((p) => p.tema)
  return (
    <QueryClientProvider client={clienteConsultas}>
      <Theme theme={genesisTheme} mode={modoDoTema[tema]}>
        <LinkProvider component={LinkRota}>
          <RouterProvider router={roteador} />
        </LinkProvider>
      </Theme>
    </QueryClientProvider>
  )
}
