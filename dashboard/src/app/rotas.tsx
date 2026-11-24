import { createBrowserRouter } from 'react-router-dom'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { CascaVisor } from '@/shared/design-system/templates/CascaVisor'
import { Moldura } from './Moldura'
import { PaginaAjustes } from './PaginaAjustes'
import { PaginaEsboco } from './PaginaEsboco'

/**
 * Mapa de rotas: cada endereço (URL) aponta para uma página.
 * As páginas reais entram fase a fase, substituindo os esboços.
 */
export const roteador = createBrowserRouter([
  {
    element: <Moldura />,
    children: [
      { path: '/', element: <PaginaEsboco titulo="Agora" fase={3} /> },
      { path: '/historico', element: <PaginaEsboco titulo="Histórico" fase={4} /> },
      { path: '/ciclo', element: <PaginaEsboco titulo="Ciclo" fase={3} /> },
      { path: '/dinheiro', element: <PaginaEsboco titulo="Dinheiro" fase={5} /> },
      { path: '/agente-x-regras', element: <PaginaEsboco titulo="Agente × regras" fase={4} /> },
      { path: '/ajustes', element: <PaginaAjustes /> },
      { path: '/dev', element: <PaginaEsboco titulo="Estufas lado a lado" fase={7} /> },
      { path: '/dev/treino', element: <PaginaEsboco titulo="Treino e gerações" fase={8} /> },
      { path: '/dev/modelo', element: <PaginaEsboco titulo="Modelo" fase={9} /> },
      { path: '/dev/gravacoes', element: <PaginaEsboco titulo="Gravações" fase={10} /> },
      { path: '*', element: <PaginaEsboco titulo="Página não encontrada" fase={0} /> },
    ],
  },
  {
    // O visor fica fora da Moldura: sem barra lateral nem abas
    path: '/visor',
    element: (
      <CascaVisor>
        <VStack gap={2}>
          <Heading level={1}>Visor</Heading>
          <Text color="secondary">A tela fixa da estufa chega na Fase 6.</Text>
        </VStack>
      </CascaVisor>
    ),
  },
])
