/**
 * Raiz de composição: o ÚNICO lugar que sabe de onde vêm os dados.
 *
 * As telas pedem dados a "portas" (interfaces, em application/ de cada módulo)
 * e nunca sabem se quem responde é o simulador, o treino ou a estufa real.
 * Aqui se escolhe o "adaptador" (a peça que implementa a porta):
 *
 *   npm run demo  -> dadosExemplo (JSON fixo, coerente; usado também nos testes)
 *   npm run dev   -> simuladorBrinquedo (estufa de brinquedo num Web Worker)
 *   depois        -> Supabase Realtime, arquivos do treino, MQTT (quando o backend existir)
 *
 * shortcut: na Fase 0 só a escolha existe; as portas e adaptadores chegam na Fase 1.
 */
export const origemDosDados: 'exemplo' | 'simulada' = import.meta.env.MODE === 'demo' ? 'exemplo' : 'simulada'
