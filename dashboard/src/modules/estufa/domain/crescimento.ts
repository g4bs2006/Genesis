/**
 * Crescimento esperado da alface (massa fresca por pé) ao longo do ciclo.
 *
 * Curva logística: começa devagar (muda), acelera no meio e desacelera perto
 * da colheita. Calibrada no rascunho: dia 23 → 182 g, dia 35 → ~245 g.
 * shortcut: é uma curva de referência, não o modelo de Van Henten; quando o
 * simulador do backend existir, a massa vem dele.
 */
const MASSA_MAXIMA = 260 // g
const INCLINACAO = 0.1618 // por dia
const DIA_DO_MEIO = 17.76 // dia em que a planta tem metade da massa máxima

export function massaEsperada(dia: number): number {
  return MASSA_MAXIMA / (1 + Math.exp(-INCLINACAO * (dia - DIA_DO_MEIO)))
}

/** A curva inteira, um ponto por dia (para o gráfico do ciclo). */
export function curvaDeCrescimento(diasDoCiclo: number): { dia: number; massa: number }[] {
  return Array.from({ length: diasDoCiclo + 1 }, (_, dia) => ({ dia, massa: massaEsperada(dia) }))
}

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
