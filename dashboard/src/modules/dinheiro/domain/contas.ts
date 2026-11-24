/**
 * Contas de dinheiro de um ciclo: quanto a estufa gasta, quanto vende e quanto
 * sobra (docs/plano.md, "Lucro × gasto projetado").
 *
 * Tudo aqui é função pura: entra número, sai número, sem tela e sem rede. Assim
 * dá para testar cada conta com valores feitos à mão.
 *
 * Nada é arredondado no meio das contas: arredondar cedo acumula erro (centavos
 * perdidos em cada passo viram reais no ano). Só os formatadores, no fim,
 * arredondam para mostrar.
 */
import type { ResumoCiclo } from '@/modules/estufa/dominio'
import type { Precos } from './contrato'

/** Cenário de preço de venda da alface (o Precos guarda um valor para cada). */
export type Cenario = 'baixo' | 'medio' | 'alto'

export interface Custos {
  energia: number
  nutrientes: number
  acido: number
  agua: number
  mudas: number
  fixos: number
  total: number
}

export interface Resultado {
  receita: number
  custos: Custos
  lucro: number
  /** lucro / receita (0,17 = 17%). 0 quando não há receita, para não dividir por zero. */
  margem: number
}

/**
 * Suposição: o preço por pé do Precos vale para um pé comercial de 220 g.
 * Pé mais pesado vale mais, pé mais leve vale menos, na proporção do peso.
 */
export const MASSA_COMERCIAL_G = 220
/** Suposição: pé abaixo de 120 g não é vendido (fica fora do padrão comercial). */
export const MASSA_MINIMA_VENDA_G = 120
/** Suposição: o comprador paga no máximo 10% a mais por um pé grande. */
export const FATOR_PESO_MAXIMO = 1.1

/** Quanto do preço cheio um pé vale pelo peso: 0 (não vende) até 1,1. */
export function fatorPeso(massaPorPe: number): number {
  if (massaPorPe < MASSA_MINIMA_VENDA_G) return 0
  return Math.min(Math.max(massaPorPe / MASSA_COMERCIAL_G, 0), FATOR_PESO_MAXIMO)
}

/** Gastos do ciclo em R$, a partir do que a estufa consumiu (ResumoCiclo). */
export function custosDoCiclo(resumo: ResumoCiclo, plantas: number, precos: Precos): Custos {
  // Os preços vêm em unidades de loja (kg, L, m³); o consumo, em unidades de
  // sensor (g, ml, L). Por isso as divisões por 1000.
  const energia = resumo.energiaKwh * precos.tarifaKwh
  const nutrientes = (resumo.nutrienteG / 1000) * precos.nutrientePorKg
  const acido = (resumo.acidoMl / 1000) * precos.acidoPorL
  const agua = (resumo.aguaL / 1000) * precos.aguaPorM3
  const mudas = plantas * precos.mudaPorUnidade
  const fixos = precos.fixosPorCiclo
  return { energia, nutrientes, acido, agua, mudas, fixos, total: energia + nutrientes + acido + agua + mudas + fixos }
}

/**
 * Quanto se vende no ciclo: plantas × preço do pé × fator de peso.
 * Suposição: todas as plantas chegam à colheita e todas são vendidas.
 */
export function receitaDoCiclo(massaPorPe: number, plantas: number, precos: Precos, cenario: Cenario): number {
  return plantas * precos.alfacePorPe[cenario] * fatorPeso(massaPorPe)
}

/** Receita, custos e lucro de um ciclo. */
export function resultadoDoCiclo(resumo: ResumoCiclo, plantas: number, precos: Precos, cenario: Cenario): Resultado {
  const receita = receitaDoCiclo(resumo.massaPorPe, plantas, precos, cenario)
  const custos = custosDoCiclo(resumo, plantas, precos)
  const lucro = receita - custos.total
  return { receita, custos, lucro, margem: receita === 0 ? 0 : lucro / receita }
}

/** Dias usados para "por mês" e "por ano". */
export const DIAS_NO_MES = 30
export const DIAS_NO_ANO = 365

/**
 * Lucro de um ciclo esticado para mês e ano.
 * Suposição: um ciclo começa logo que o outro termina (sem dias parados entre
 * colheita e novo plantio) e todos os ciclos rendem igual.
 */
export function projecao(lucroPorCiclo: number, diasDoCiclo: number): { ciclo: number; mes: number; ano: number } {
  const porDia = lucroPorCiclo / diasDoCiclo
  return { ciclo: lucroPorCiclo, mes: porDia * DIAS_NO_MES, ano: porDia * DIAS_NO_ANO }
}

/**
 * Ponto de equilíbrio: onde o lucro vira zero.
 *
 * precoMinimoPorPe: o menor preço do pé (de 220 g) que ainda paga todos os
 * custos, com as mesmas plantas e o mesmo peso. Infinity se nenhum pé vende.
 *
 * plantasMinimas: quantas plantas pagam os custos fixos.
 * Suposição: energia, água, nutrientes, ácido e mudas crescem na mesma
 * proporção do número de plantas (dobrou as plantas, dobra o consumo). Na
 * estufa real a energia de clima pesa quase igual com poucas ou muitas
 * plantas, então este número é otimista. Infinity se cada planta dá prejuízo
 * (aí plantar mais só aumenta o prejuízo).
 */
export function pontoDeEquilibrio(
  resumo: ResumoCiclo,
  plantas: number,
  precos: Precos,
  cenario: Cenario,
): { precoMinimoPorPe: number; plantasMinimas: number } {
  const custos = custosDoCiclo(resumo, plantas, precos)
  const fator = fatorPeso(resumo.massaPorPe)
  const precoMinimoPorPe = plantas > 0 && fator > 0 ? custos.total / (plantas * fator) : Infinity

  if (plantas <= 0) return { precoMinimoPorPe, plantasMinimas: Infinity }
  const variavelPorPlanta = (custos.total - custos.fixos) / plantas
  const receitaPorPlanta = precos.alfacePorPe[cenario] * fator
  const sobraPorPlanta = receitaPorPlanta - variavelPorPlanta
  const plantasMinimas = sobraPorPlanta > 0 ? custos.fixos / sobraPorPlanta : Infinity
  return { precoMinimoPorPe, plantasMinimas }
}

/**
 * O número que vende o projeto: quanto o agente ganha a mais que as regras
 * fixas, em R$ por ciclo. Positivo: o agente ganha; negativo: as regras ganham.
 * As duas estufas usam as mesmas plantas e os mesmos preços, para a diferença
 * vir só do controle.
 */
export function vantagemDoAgente(
  agente: ResumoCiclo,
  regras: ResumoCiclo,
  plantas: number,
  precos: Precos,
  cenario: Cenario,
): number {
  return (
    resultadoDoCiclo(agente, plantas, precos, cenario).lucro - resultadoDoCiclo(regras, plantas, precos, cenario).lucro
  )
}

export type ChaveBarra = 'energia' | 'nutrientes' | 'acido' | 'agua' | 'mudas' | 'fixos' | 'lucro'

export interface FatiaBarra {
  chave: ChaveBarra
  rotulo: string
  valor: number
  /** Só no lucro, e só quando ele é negativo: o tamanho do prejuízo em R$. */
  prejuizo?: number
}

const ROTULOS: Record<ChaveBarra, string> = {
  energia: 'Energia',
  nutrientes: 'Nutrientes',
  acido: 'Ácido',
  agua: 'Água',
  mudas: 'Mudas',
  fixos: 'Fixos',
  lucro: 'Lucro',
}

const ORDEM_CUSTOS = ['energia', 'nutrientes', 'acido', 'agua', 'mudas', 'fixos'] as const

/**
 * Fatias para uma barra empilhada: os custos e, por último, o lucro. Somadas,
 * dão a receita. Barra empilhada não tem fatia negativa, então prejuízo vira
 * lucro 0 com o campo `prejuizo` para a tela avisar.
 */
export function barraDeCustos(resultado: Resultado): FatiaBarra[] {
  const fatias: FatiaBarra[] = ORDEM_CUSTOS.map((chave) => ({
    chave,
    rotulo: ROTULOS[chave],
    valor: resultado.custos[chave],
  }))
  const { lucro } = resultado
  fatias.push(
    lucro < 0
      ? { chave: 'lucro', rotulo: ROTULOS.lucro, valor: 0, prejuizo: -lucro }
      : { chave: 'lucro', rotulo: ROTULOS.lucro, valor: lucro },
  )
  return fatias
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
