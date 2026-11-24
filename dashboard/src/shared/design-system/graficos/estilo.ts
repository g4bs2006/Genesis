/**
 * Estilo comum dos gráficos (visx, decisão 0001): tudo por token do tema.
 * Rótulos de eixo em Geist Mono pequena; linhas de grade quase invisíveis.
 */
export const COR = {
  eixo: 'var(--texto-3)',
  grade: 'var(--linha)',
  linha: 'var(--texto-2)',
  neutra: 'var(--serie-cinza)',
  faixa: 'var(--ok)',
  ok: 'var(--ok)',
  atencao: 'var(--atencao)',
  risco: 'var(--risco)',
} as const

export const rotuloEixo = {
  fill: 'var(--texto-3)',
  fontSize: 11,
  fontFamily: 'var(--font-family-code)',
} as const

/** Cores de série (estufas e controladores), sempre na mesma ordem. */
export const SERIES = [
  'var(--serie-azul)',
  'var(--serie-verde)',
  'var(--serie-amarelo)',
  'var(--serie-roxo)',
  'var(--serie-laranja)',
  'var(--serie-menta)',
  'var(--serie-cinza)',
] as const

export const corDaSerie = (i: number) => SERIES[i % SERIES.length]!
