/**
 * O ciclo da alface: os estágios e a massa por pé de cada dia.
 *
 * A massa vem da fonte (na reprodução, a massa por dia gravada pelo simulador
 * do treino). Até o passo 08 havia aqui uma curva logística "calibrada no
 * rascunho": era um número inventado e saiu (passo 10).
 */

/** A massa num dia fracionário, ligando em linha reta o fim de um dia ao do outro. */
export function massaNoDia(massaPorDia: readonly number[], dia: number): number {
  if (massaPorDia.length === 0) return 0
  const d = Math.min(Math.max(dia, 0), massaPorDia.length - 1)
  const i = Math.floor(d)
  const a = massaPorDia[i]!
  const b = massaPorDia[Math.min(i + 1, massaPorDia.length - 1)]!
  return a + (b - a) * (d - i)
}

/** A curva inteira, um ponto por dia (para o gráfico do ciclo). */
export const curvaDoCiclo = (massaPorDia: readonly number[]) => massaPorDia.map((massa, dia) => ({ dia, massa }))

export type Estagio = { nome: string; inicio: number; fim: number; descricao: string }

/** Estágios da alface em NFT num ciclo de ~35 dias após o transplante. */
export const ESTAGIOS: Estagio[] = [
  { nome: 'Pegamento', inicio: 0, fim: 7, descricao: 'A muda firma as raízes no canal.' },
  { nome: 'Folhas novas', inicio: 7, fim: 18, descricao: 'Cresce devagar, abrindo folhas.' },
  { nome: 'Crescimento rápido', inicio: 18, fim: 30, descricao: 'Ganha a maior parte da massa.' },
  { nome: 'Fechamento', inicio: 30, fim: 35, descricao: 'A cabeça fecha; ponto de colheita.' },
]

export function estagioDoDia(dia: number): Estagio {
  return ESTAGIOS.find((e) => dia < e.fim) ?? ESTAGIOS[ESTAGIOS.length - 1]!
}
