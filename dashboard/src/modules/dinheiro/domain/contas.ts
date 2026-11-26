/**
 * A conta de um ciclo, como o produtor faz na planilha (passo 11): quantos
 * pés, quanto pesam, por quanto vende, quanto entra; cada gasto numa linha;
 * o que sobra. E o ponto de equilíbrio.
 *
 * Tudo aqui é função pura: entra número, sai número, sem tela e sem rede. Nada
 * é arredondado no meio das contas (centavos perdidos em cada passo viram
 * reais no ano); só os formatadores, no fim, arredondam para mostrar.
 */
import type { ResumoCiclo } from '@/modules/estufa/dominio'
import type { Precos } from './contrato'

/**
 * Suposições do preço (as mesmas da nota do treino, controle/metricas.py):
 * o preço vale para um pé de 220 g; pé mais pesado vale mais, na proporção,
 * até 10% a mais; abaixo de 120 g não se vende.
 */
export const MASSA_COMERCIAL_G = 220
export const MASSA_MINIMA_VENDA_G = 120
export const FATOR_PESO_MAXIMO = 1.1

/** Quanto do preço cheio um pé vale pelo peso: 0 (não vende) até 1,1. */
export function fatorPeso(massaPorPe: number): number {
  if (massaPorPe < MASSA_MINIMA_VENDA_G) return 0
  return Math.min(Math.max(massaPorPe / MASSA_COMERCIAL_G, 0), FATOR_PESO_MAXIMO)
}

/** As linhas de gasto: as mesmas da conta prevista e dos lançamentos reais. */
export const CATEGORIAS_GASTO = ['energia', 'agua', 'adubo', 'mudas', 'embalagem', 'outros'] as const
export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number]
export type Categoria = 'venda' | CategoriaGasto

export const NOME_CATEGORIA: Record<Categoria, string> = {
  venda: 'Venda de alface',
  energia: 'Energia',
  agua: 'Água',
  adubo: 'Adubo',
  mudas: 'Mudas',
  embalagem: 'Embalagem',
  outros: 'Mão de obra e outros',
}

export interface ContaDoCiclo {
  plantas: number
  massaPorPe: number
  /** quanto do preço cheio cada pé vale pelo peso */
  fator: number
  /** o preço de um pé deste peso */
  precoDoPe: number
  venda: number
  energiaKwh: number
  aguaL: number
  gastos: Record<CategoriaGasto, number>
  totalGastos: number
  sobra: number
  /** abaixo deste preço (por pé de 220 g) o ciclo dá prejuízo; Infinity se nenhum pé vende */
  precoMinimoPorPe: number
}

/**
 * A conta prevista do ciclo. O consumo (kWh, litros, massa) vem do ResumoCiclo
 * (na reprodução, o que a gravação mediu); os preços são os do produtor.
 * Suposição: todas as plantas chegam à colheita e todas são vendidas.
 */
export function contaDoCiclo(resumo: ResumoCiclo, plantas: number, precos: Precos): ContaDoCiclo {
  const fator = fatorPeso(resumo.massaPorPe)
  const precoDoPe = precos.alfacePorPe * fator
  const venda = plantas * precoDoPe
  const gastos: Record<CategoriaGasto, number> = {
    energia: resumo.energiaKwh * precos.tarifaKwh,
    // o consumo vem em litros; a tarifa, em m³ (1 m³ = 1000 L)
    agua: (resumo.aguaL / 1000) * precos.aguaPorM3,
    adubo: precos.aduboPorCiclo,
    mudas: plantas * precos.mudaPorUnidade,
    embalagem: plantas * precos.embalagemPorPe,
    outros: precos.outrosPorCiclo,
  }
  const totalGastos = CATEGORIAS_GASTO.reduce((soma, c) => soma + gastos[c], 0)
  return {
    plantas,
    massaPorPe: resumo.massaPorPe,
    fator,
    precoDoPe,
    venda,
    energiaKwh: resumo.energiaKwh,
    aguaL: resumo.aguaL,
    gastos,
    totalGastos,
    sobra: venda - totalGastos,
    precoMinimoPorPe: plantas > 0 && fator > 0 ? totalGastos / (plantas * fator) : Infinity,
  }
}

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const reaisSemCentavos = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** 1234.56 → 'R$ 1.234,56'. O espaço depois de R$ é inseparável (não quebra a linha). */
export function formatarReais(valor: number): string {
  return reais.format(valor)
}

/** Para números grandes, sem centavos: 1234.56 → 'R$ 1.235'. */
export function formatarReaisCurto(valor: number): string {
  return reaisSemCentavos.format(valor)
}
