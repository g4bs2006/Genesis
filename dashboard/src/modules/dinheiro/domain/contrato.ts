/**
 * Os preços do produtor, que entram na conta do ciclo. Todos editáveis na
 * página Dinheiro (passo 11). Antes havia três preços da alface (baixo, médio,
 * alto) e "custos fixos"; o Gabriel achou a tela confusa, e a conta passou a
 * usar um preço só e um gasto por linha, como numa planilha.
 */
import { z } from 'zod'

const reais = z.number().min(0)

export const Precos = z.object({
  alfacePorPe: reais, // R$ por pé de 220 g vendido (pé maior vale até 10% a mais)
  tarifaKwh: reais, // R$/kWh
  aguaPorM3: reais, // R$/m³
  mudaPorUnidade: reais, // R$ por muda
  aduboPorCiclo: reais, // R$ de adubo (sais A+B) no ciclo: a simulação da fase 1 ainda não dosa
  embalagemPorPe: reais, // R$ de embalagem por pé vendido (0 se vende sem)
  outrosPorCiclo: reais, // mão de obra e estrutura dividida por ciclo
})
export type Precos = z.infer<typeof Precos>

/** O formato até o passo 10, para não perder o que o produtor já tinha salvo. */
export const PrecosAntigos = z.object({
  alfacePorPe: z.object({ baixo: reais, medio: reais, alto: reais }),
  tarifaKwh: reais,
  aguaPorM3: reais,
  mudaPorUnidade: reais,
  fixosPorCiclo: reais,
})
