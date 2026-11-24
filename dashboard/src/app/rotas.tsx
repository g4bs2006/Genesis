import { createBrowserRouter } from 'react-router-dom'
import type { ComponentType } from 'react'
import { Moldura } from './Moldura'
import { PaginaAjustes } from './PaginaAjustes'
import { PaginaEsboco } from './PaginaEsboco'

/**
 * Mapa de rotas: cada endereço (URL) aponta para uma página.
 *
 * `lazy`: o código de cada página só é baixado quando ela é aberta (o app
 * abre mais rápido). Enquanto baixa, a página atual continua na tela e a
 * barrinha do topo aparece se demorar (Moldura + BarraProgresso).
 */
const pagina = <T,>(carregar: () => Promise<T>, nome: keyof T) => ({
  lazy: async () => ({ Component: (await carregar())[nome] as ComponentType }),
})

export const roteador = createBrowserRouter([
  {
    element: <Moldura />,
    children: [
      { path: '/', ...pagina(() => import('./composicoes/PaginaAgora'), 'PaginaAgora') },
      { path: '/historico', ...pagina(() => import('./composicoes/PaginaHistorico'), 'PaginaHistorico') },
      { path: '/ciclo', ...pagina(() => import('./composicoes/PaginaCiclo'), 'PaginaCiclo') },
      { path: '/dinheiro', element: <PaginaEsboco titulo="Dinheiro" fase={5} /> },
      { path: '/agente-x-regras', ...pagina(() => import('./composicoes/PaginaAgenteRegras'), 'PaginaAgenteRegras') },
      { path: '/ajustes', element: <PaginaAjustes /> },
      { path: '/dev', element: <PaginaEsboco titulo="Estufas lado a lado" fase={7} /> },
      { path: '/dev/treino', element: <PaginaEsboco titulo="Treino e gerações" fase={8} /> },
      { path: '/dev/modelo', element: <PaginaEsboco titulo="Modelo" fase={9} /> },
      { path: '/dev/gravacoes', element: <PaginaEsboco titulo="Gravações" fase={10} /> },
      {
        path: '/laboratorio/alface',
        ...pagina(() => import('@/modules/alface'), 'PaginaLaboratorioAlface'),
      },
      { path: '*', element: <PaginaEsboco titulo="Página não encontrada" fase={0} /> },
    ],
  },
  // O visor fica fora da Moldura: sem barra lateral nem abas
  { path: '/visor', ...pagina(() => import('./composicoes/PaginaVisor'), 'PaginaVisor') },
])
