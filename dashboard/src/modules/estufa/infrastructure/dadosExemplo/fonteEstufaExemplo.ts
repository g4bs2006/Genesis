/**
 * Adaptador "dados de exemplo" da porta FonteEstufa.
 *
 * Responde com um dia gravado de 4 estufas (estufas.json, gerado por
 * scripts/gerar-dados-exemplo.ts) como se fosse o backend: com um pouco de
 * espera (para as telas mostrarem o "carregando") e com passos novos chegando
 * a cada 3 s (para o modo demo parecer vivo).
 */
import { z } from 'zod'
import { Estufa, Evento, Passo, ResumoCiclo } from '../../domain/contrato'
import type { FonteEstufa } from '../../application/portas'
import arquivo from './estufas.json'

/** O formato do arquivo. Conferido com Zod na primeira leitura: JSON editado à mão errado quebra aqui, não na tela. */
export const DadosEstufaExemplo = z.object({
  estufas: z.array(Estufa),
  passos: z.record(z.string(), z.array(Passo)),
  eventos: z.array(Evento),
  resumos: z.array(ResumoCiclo),
})
export type DadosEstufaExemplo = z.infer<typeof DadosEstufaExemplo>

const LATENCIA_MS = 150
const INTERVALO_REPRISE_MS = 3000
const DIA_MS = 24 * 60 * 60 * 1000

let dados: DadosEstufaExemplo | undefined
/** Confere o arquivo só quando alguém pede (e uma vez só). */
const carregar = () => (dados ??= DadosEstufaExemplo.parse(arquivo))

/** Devolve o valor depois de um tempinho, como uma rede de verdade faria. */
const comAtraso = <T>(valor: () => T) =>
  new Promise<T>((resolver, rejeitar) =>
    setTimeout(() => {
      try {
        resolver(valor())
      } catch (erro) {
        rejeitar(erro)
      }
    }, LATENCIA_MS),
  )

/** O mesmo passo, "empurrado" n dias para frente no relógio. */
function adiantar(passo: Passo, dias: number): Passo {
  const instante = new Date(Date.parse(passo.leitura.instante) + dias * DIA_MS)
  // volta para o fuso de Brasília (-03:00), o formato do contrato
  const local = new Date(instante.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 19)
  return { ...passo, leitura: { ...passo.leitura, instante: `${local}-03:00` } }
}

export function criarFonteEstufaExemplo(): FonteEstufa {
  return {
    listarEstufas: () => comAtraso(() => carregar().estufas),

    assinarPassos(estufaId, aoReceber) {
      const passos = carregar().passos[estufaId] ?? []
      const ultimo = passos.at(-1)
      if (!ultimo) return () => {}
      aoReceber(ultimo)
      // Reprise: o dia gravado termina agora (14h30). O passo k de ontem, um dia
      // depois, cai exatamente 10 min × (k+1) à frente: a hora do dia bate com o
      // clima gravado e o relógio da tela só anda para frente.
      let k = 0
      const id = setInterval(() => {
        aoReceber(adiantar(passos[k % passos.length]!, 1 + Math.floor(k / passos.length)))
        k++
      }, INTERVALO_REPRISE_MS)
      return () => clearInterval(id)
    },

    historico: (estufaId, de, ate) =>
      comAtraso(() => {
        const [inicio, fim] = [Date.parse(de), Date.parse(ate)]
        return (carregar().passos[estufaId] ?? []).filter((p) => {
          const t = Date.parse(p.leitura.instante)
          return t >= inicio && t <= fim
        })
      }),

    eventos: (estufaId) => comAtraso(() => carregar().eventos.filter((e) => e.estufaId === estufaId)),

    resumoCiclo: (estufaId) =>
      comAtraso(() => {
        const resumo = carregar().resumos.find((r) => r.estufaId === estufaId)
        if (!resumo) throw new Error(`Estufa sem resumo de ciclo: ${estufaId}`)
        return resumo
      }),
  }
}
