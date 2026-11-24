/**
 * Preços que entram na conta de lucro × gasto. Todos editáveis pelo produtor.
 * Referências: CEAGESP / Conab Prohort (alface), ANEEL (tarifa).
 */
import { z } from 'zod'

const reais = z.number().min(0)

export const Precos = z.object({
  alfacePorPe: z.object({ baixo: reais, medio: reais, alto: reais }), // R$ por pé vendido
  tarifaKwh: reais, // R$/kWh médio (a tarifa variável vem na Leitura)
  nutrientePorKg: reais, // R$/kg de sal nutritivo A+B
  acidoPorL: reais, // R$/L de corretivo de pH
  aguaPorM3: reais, // R$/m³
  mudaPorUnidade: reais, // R$ por muda
  fixosPorCiclo: reais, // equipamento amortizado + mão de obra, por ciclo
})
export type Precos = z.infer<typeof Precos>
