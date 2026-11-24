/**
 * Do estado da estufa para a cara da planta.
 *
 * shortcut: regra simples e instantânea (o estado de agora vira a aparência de
 * agora). Na planta real o efeito acumula com o tempo; quando o simulador do
 * backend tiver um modelo de estresse, a aparência vem dele.
 */
import { FAIXAS, type Leitura } from '@/modules/estufa/dominio'
import type { ParametrosAlface } from './gerarAlface'

const clamp = (n: number) => Math.min(1, Math.max(0, n))
/** Quanto passou do limite, em frações da largura da faixa (0 dentro da faixa) */
function excesso(valor: number, min: number, max: number): number {
  const largura = max - min
  if (valor > max) return (valor - max) / largura
  if (valor < min) return (min - valor) / largura
  return 0
}

export function aparenciaDaPlanta(leitura: Leitura, massa: number): ParametrosAlface {
  const { ar, solucao } = leitura
  // Murcha: ar quente, VPD alto (ar seco) ou reservatório quase vazio
  const calor = clamp((ar.temperatura - FAIXAS.temperatura.max) / 6)
  const sede = clamp((ar.vpd - FAIXAS.vpd.max) / 1.0)
  const semAgua = clamp((FAIXAS.nivel.min - solucao.nivel) / FAIXAS.nivel.min)
  const turgor = clamp(1 - Math.max(calor, sede, semAgua) * 0.8)
  // Amarela: pouco nutriente na água (EC baixa)
  const clorose = clamp((FAIXAS.ec.min - solucao.ec) / 0.6)
  // Queima: pH fora da faixa ou sal demais (EC alta)
  const necrose = clamp(Math.max(excesso(solucao.ph, FAIXAS.ph.min, FAIXAS.ph.max) * 1.2, (solucao.ec - 2.2) / 1.0))
  return { massa, turgor, clorose, necrose }
}

/** Uma frase curta para o leitor de tela e para o card. */
export function descreverPlanta(p: ParametrosAlface): string {
  const estado =
    p.turgor < 0.6 ? 'murcha' : p.clorose > 0.3 ? 'amarelando' : p.necrose > 0.3 ? 'com bordas queimadas' : 'saudável'
  return `Alface de ${Math.round(p.massa)} g, ${estado}`
}

/** Semente estável por estufa: cada estufa tem a "sua" alface. */
export function sementeDaEstufa(id: string): number {
  let h = 7
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % 1000
}
