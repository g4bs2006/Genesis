/** Velocidades da reprodução (Vitrine do produtor) e como dizê-las. */

/** As velocidades da Vitrine, em passos de 10 min por segundo de tela. */
export const VELOCIDADES_REPRODUCAO = [1, 6, 36, 144] as const

/** 6 → "1 h por segundo": quanto tempo de estufa passa em um segundo de tela. */
export function rotuloVelocidade(passosPorSegundo: number): string {
  const minutos = passosPorSegundo * 10
  if (minutos >= 1440) return `${minutos / 1440 === 1 ? '1 dia' : `${minutos / 1440} dias`} por segundo`
  if (minutos >= 60) return `${minutos / 60} h por segundo`
  return `${minutos} min por segundo`
}
