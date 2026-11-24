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
import {
  BanknotesIcon as BanknotesCheio,
  BeakerIcon as BeakerCheio,
  Cog6ToothIcon as Cog6ToothCheio,
  HomeIcon as HomeCheio,
  SparklesIcon as SparklesCheio,
} from '@heroicons/react/24/solid'
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
    // no celular, a aba ativa ganha o ícone cheio (a cor sozinha é pouco)
    celular: [
      { rota: '/', rotulo: 'Agora', icone: HomeIcon, iconeAtivo: HomeCheio },
      { rota: '/ciclo', rotulo: 'Ciclo', icone: SparklesIcon, iconeAtivo: SparklesCheio },
      { rota: '/dinheiro', rotulo: 'Dinheiro', icone: BanknotesIcon, iconeAtivo: BanknotesCheio },
      { rota: '/ajustes', rotulo: 'Ajustes', icone: Cog6ToothIcon, iconeAtivo: Cog6ToothCheio },
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
      { rota: '/dev', rotulo: 'Resumo', icone: BeakerIcon, iconeAtivo: BeakerCheio },
      { rota: '/ajustes', rotulo: 'Ajustes', icone: Cog6ToothIcon, iconeAtivo: Cog6ToothCheio },
    ],
  },
} satisfies Record<string, Record<'desktop' | 'celular', ItemNavegacao[]>>
