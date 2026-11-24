/**
 * Raiz de composição: o ÚNICO lugar que sabe de onde vêm os dados.
 *
 * As telas pedem dados a "portas" (interfaces, em application/ de cada módulo)
 * e nunca sabem se quem responde é o simulador, o treino ou a estufa real.
 * Aqui se escolhe o "adaptador" (a peça que implementa a porta):
 *
 *   npm run demo  -> dadosExemplo (JSON fixo e coerente; também nos testes e2e)
 *   npm run dev   -> simuladorBrinquedo (estufa de brinquedo num Web Worker)
 *   depois        -> Supabase Realtime, arquivos do treino, MQTT (backend)
 *
 * O treino e as gravações ainda não existem de verdade: nos dois modos vêm dos
 * dados de exemplo, com o selo "dados de exemplo" na tela.
 */
import { criarFonteEstufaExemplo, criarSimuladorBrinquedo } from '@/modules/estufa'
import { criarFonteGravacoesExemplo, criarFonteTreinoExemplo } from '@/modules/treino'
import { criarRepositorioPrecosLocal } from '@/modules/dinheiro'

const demo = import.meta.env.MODE === 'demo'

export const origemDosDados: 'exemplo' | 'simulada' = demo ? 'exemplo' : 'simulada'

const simulador = demo ? null : criarSimuladorBrinquedo()

export const dependencias = {
  fonteEstufa: simulador ?? criarFonteEstufaExemplo(),
  controleSimulacao: simulador,
  fonteTreino: criarFonteTreinoExemplo(),
  fonteGravacoes: criarFonteGravacoesExemplo(),
  repositorioPrecos: criarRepositorioPrecosLocal(),
}
