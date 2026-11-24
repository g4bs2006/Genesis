import type { NomeDesenho } from '../domain/escolherDesenho'
import amarelando from '../assets/amarelando.webp'
import dia05 from '../assets/dia-05.webp'
import dia12 from '../assets/dia-12.webp'
import dia20 from '../assets/dia-20.webp'
import dia28 from '../assets/dia-28.webp'
import dia35 from '../assets/dia-35.webp'
import murcha from '../assets/murcha.webp'
import queimada from '../assets/queimada.webp'

/** Desenhos gerados por IA (scripts/gerar-alfaces-ia.mjs), mesmo traço e mesmo cano em todos. */
export const DESENHOS: Record<NomeDesenho, string> = {
  'dia-05': dia05,
  'dia-12': dia12,
  'dia-20': dia20,
  'dia-28': dia28,
  'dia-35': dia35,
  murcha,
  amarelando,
  queimada,
}
