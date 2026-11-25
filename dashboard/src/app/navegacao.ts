/**
 * Os destinos de cada modo e tamanho de tela. As cascas (shared/design-system)
 * só desenham o que recebem daqui.
 */
// ícones próprios (decisão 0006): cada um diz o que a página é na estufa
import {
  IconeAjustes,
  IconeAjustesCheio,
  IconeCiclo,
  IconeCicloCheio,
  IconeComparar,
  IconeDinheiro,
  IconeDinheiroCheio,
  IconeEstufa,
  IconeEstufaCheio,
  IconeEstufas,
  IconeGravacao,
  IconeHistorico,
  IconeRede,
  IconeTreino,
  IconeTreinoCheio,
} from '@/shared/design-system/atoms/Icones'
import type { ItemNavegacao } from '@/shared/design-system/templates/tipos'

export const navegacao = {
  produtor: {
    desktop: [
      { rota: '/', rotulo: 'Agora', icone: IconeEstufa },
      { rota: '/historico', rotulo: 'Histórico', icone: IconeHistorico },
      { rota: '/ciclo', rotulo: 'Ciclo', icone: IconeCiclo },
      { rota: '/dinheiro', rotulo: 'Dinheiro', icone: IconeDinheiro },
      { rota: '/agente-x-regras', rotulo: 'Agente × regras', icone: IconeComparar },
      { rota: '/ajustes', rotulo: 'Ajustes', icone: IconeAjustes },
    ],
    // no celular, a aba ativa ganha o ícone cheio (a cor sozinha é pouco)
    celular: [
      { rota: '/', rotulo: 'Agora', icone: IconeEstufa, iconeAtivo: IconeEstufaCheio },
      { rota: '/ciclo', rotulo: 'Ciclo', icone: IconeCiclo, iconeAtivo: IconeCicloCheio },
      { rota: '/dinheiro', rotulo: 'Dinheiro', icone: IconeDinheiro, iconeAtivo: IconeDinheiroCheio },
      { rota: '/ajustes', rotulo: 'Ajustes', icone: IconeAjustes, iconeAtivo: IconeAjustesCheio },
    ],
  },
  desenvolvedor: {
    desktop: [
      { rota: '/dev', rotulo: 'Estufas lado a lado', icone: IconeEstufas },
      { rota: '/dev/treino', rotulo: 'Treino e gerações', icone: IconeTreino },
      { rota: '/dev/modelo', rotulo: 'Modelo', icone: IconeRede },
      { rota: '/dev/gravacoes', rotulo: 'Gravações', icone: IconeGravacao },
    ],
    // no celular, o desenvolvedor só vê o resumo do treino (seção 6 do prompt)
    celular: [
      { rota: '/dev', rotulo: 'Resumo', icone: IconeTreino, iconeAtivo: IconeTreinoCheio },
      { rota: '/ajustes', rotulo: 'Ajustes', icone: IconeAjustes, iconeAtivo: IconeAjustesCheio },
    ],
  },
} satisfies Record<string, Record<'desktop' | 'celular', ItemNavegacao[]>>
