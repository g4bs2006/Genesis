import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, Link as LinkRouter } from 'react-router-dom'
import type { ComponentProps } from 'react'
import { InternationalizationProvider } from '@astryxdesign/core/i18n'
import ptBR from '@astryxdesign/core/locales/pt-BR.generated.js'
import { LinkProvider } from '@astryxdesign/core/Link'
import { Theme } from '@astryxdesign/core/theme'
import { genesisTheme } from '@/shared/design-system/tema/genesis'
import { modoDoTema, usePreferencias } from '@/shared/stores/preferencias'
import { ProvedorEstufa } from '@/modules/estufa'
import { ProvedorTreino } from '@/modules/treino'
import { ProvedorDinheiro } from '@/modules/dinheiro'
import { dependencias as d } from './dependencias'
import { roteador } from './rotas'

// React Query: cuida das leituras assíncronas (buscar, guardar em cache,
// buscar de novo). Uma instância só para o app inteiro.
const clienteConsultas = new QueryClient()

// Os links do Astryx (SideNavItem, Button com href) passam pelo roteador:
// trocar de página não recarrega o app inteiro.
function LinkRota({ href, ...resto }: Omit<ComponentProps<typeof LinkRouter>, 'to'> & { href: string }) {
  // viewTransition: o conteúdo esmaece na troca de página (base.css)
  return <LinkRouter to={href} viewTransition {...resto} />
}

export function App() {
  const tema = usePreferencias((p) => p.tema)
  return (
    <QueryClientProvider client={clienteConsultas}>
      <Theme theme={genesisTheme} mode={modoDoTema[tema]}>
        {/* pt-BR: vírgula decimal nos campos de número e textos dos componentes */}
        <InternationalizationProvider locale="pt-BR" messages={{ 'pt-BR': ptBR }}>
          <LinkProvider component={LinkRota}>
            {/* cada módulo recebe aqui o adaptador escolhido em dependencias.ts */}
            <ProvedorEstufa fonte={d.fonteEstufa} controle={d.controleSimulacao}>
              <ProvedorTreino treino={d.fonteTreino} gravacoes={d.fonteGravacoes} origem={d.origemTreino}>
                <ProvedorDinheiro precos={d.repositorioPrecos}>
                  <RouterProvider router={roteador} />
                </ProvedorDinheiro>
              </ProvedorTreino>
            </ProvedorEstufa>
          </LinkProvider>
        </InternationalizationProvider>
      </Theme>
    </QueryClientProvider>
  )
}
