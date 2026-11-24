/**
 * Os destinos de cada modo e tamanho de tela. As cascas (shared/design-system)
 * só desenham o que recebem daqui.
 */
import {
  ArrowsRightLeftIcon,
  BeakerIcon,
  BanknotesIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  FilmIcon,
  HomeIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import type { ItemNavegacao } from '@/shared/design-system/templates/tipos'

export const navegacao = {
  produtor: {
    desktop: [
      { rota: '/', rotulo: 'Agora', icone: HomeIcon },
      { rota: '/historico', rotulo: 'Histórico', icone: ClockIcon },
      { rota: '/ciclo', rotulo: 'Ciclo', icone: SparklesIcon },
      { rota: '/dinheiro', rotulo: 'Dinheiro', icone: BanknotesIcon },
      { rota: '/agente-x-regras', rotulo: 'Agente × regras', icone: ArrowsRightLeftIcon },
      { rota: '/ajustes', rotulo: 'Ajustes', icone: Cog6ToothIcon },
    ],
    celular: [
      { rota: '/', rotulo: 'Agora', icone: HomeIcon },
      { rota: '/ciclo', rotulo: 'Ciclo', icone: SparklesIcon },
      { rota: '/dinheiro', rotulo: 'Dinheiro', icone: BanknotesIcon },
      { rota: '/ajustes', rotulo: 'Ajustes', icone: Cog6ToothIcon },
    ],
  },
  desenvolvedor: {
    desktop: [
      { rota: '/dev', rotulo: 'Estufas lado a lado', icone: Squares2X2Icon },
      { rota: '/dev/treino', rotulo: 'Treino e gerações', icone: ChartBarIcon },
      { rota: '/dev/modelo', rotulo: 'Modelo', icone: CpuChipIcon },
      { rota: '/dev/gravacoes', rotulo: 'Gravações', icone: FilmIcon },
    ],
    // no celular, o desenvolvedor só vê o resumo do treino (seção 6 do prompt)
    celular: [
      { rota: '/dev', rotulo: 'Resumo', icone: BeakerIcon },
      { rota: '/ajustes', rotulo: 'Ajustes', icone: Cog6ToothIcon },
    ],
  },
} satisfies Record<string, Record<'desktop' | 'celular', ItemNavegacao[]>>
