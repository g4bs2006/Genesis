/**
 * Qual desenho mostrar para o estado da planta.
 *
 * Os desenhos foram gerados por IA (scripts/gerar-alfaces-ia.mjs): 5 estágios
 * (dias 5, 12, 20, 28 e 35) e 3 estados de estresse na planta crescida.
 * A massa escolhe o estágio mais próximo; o pior estresse escolhe o estado.
 */

/**
 * A massa típica (g/pé) da planta de cada desenho. Só escolhe a figura, nunca
 * aparece como número na tela. São os valores da curva de referência usada
 * para gerar os desenhos (dias 5, 12, 20, 28 e 35 do rascunho).
 */
const MASSA_DO_DESENHO = { 5: 29, 12: 73, 20: 153, 28: 218, 35: 245 } as const
export type ParametrosAlface = {
  /** massa fresca por pé, em gramas */
  massa: number
  /** 0..1: 1 = folhas firmes; 0 = murchas (calor, ar seco, falta de água) */
  turgor: number
  /** 0..1: amarelamento (falta de nutriente, EC baixa) */
  clorose: number
  /** 0..1: bordas queimadas (pH fora, salinidade) */
  necrose: number
}

export const ESTAGIOS_DESENHO = [5, 12, 20, 28, 35] as const
export type NomeDesenho = 'dia-05' | 'dia-12' | 'dia-20' | 'dia-28' | 'dia-35' | 'murcha' | 'amarelando' | 'queimada'

/** Os desenhos de estresse mostram a planta de ~4 semanas: só valem para planta já grande. */
const MASSA_MINIMA_ESTRESSE = 110 // g

export function escolherDesenho(p: ParametrosAlface): NomeDesenho {
  if (p.massa >= MASSA_MINIMA_ESTRESSE) {
    if (p.turgor < 0.6) return 'murcha'
    if (p.clorose > 0.3) return 'amarelando'
    if (p.necrose > 0.3) return 'queimada'
  }
  let melhor: (typeof ESTAGIOS_DESENHO)[number] = 5
  for (const dia of ESTAGIOS_DESENHO)
    if (Math.abs(MASSA_DO_DESENHO[dia] - p.massa) < Math.abs(MASSA_DO_DESENHO[melhor] - p.massa)) melhor = dia
  return `dia-${String(melhor).padStart(2, '0')}` as NomeDesenho
}
