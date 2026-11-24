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
      // A junção hoje→ontem é descontínua (ex.: pH 6,6 às 14h30 e 5,6 às 14h40
      // de ontem, logo depois de uma dose). Na primeira volta, soma-se a
      // diferença entre os dois pontos, que vai a zero em 3 h: a tela não "pula".
      const salto = diferenca(ultimo.leitura, passos[0]!.leitura)
      let k = 0
      const id = setInterval(() => {
        const passo = adiantar(passos[k % passos.length]!, 1 + Math.floor(k / passos.length))
        const peso = Math.max(0, 1 - k / PASSOS_DE_EMENDA)
        aoReceber(peso > 0 ? emendar(passo, salto, peso) : passo)
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

const PASSOS_DE_EMENDA = 18 // 3 h de 10 min

type Numeros = { ar: Record<string, number>; solucao: Record<string, number>; fora: Record<string, number> }

function diferenca(a: Passo['leitura'], b: Passo['leitura']): Numeros {
  const sub = (x: Record<string, number>, y: Record<string, number>) =>
    Object.fromEntries(Object.keys(x).map((k) => [k, (x[k] ?? 0) - (y[k] ?? 0)]))
  return { ar: sub(a.ar, b.ar), solucao: sub(a.solucao, b.solucao), fora: sub(a.fora, b.fora) }
}

function emendar(passo: Passo, salto: Numeros, peso: number): Passo {
  const soma = <T extends Record<string, number>>(x: T, d: Record<string, number>) =>
    Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v + (d[k] ?? 0) * peso])) as T
  const l = passo.leitura
  return {
    ...passo,
    leitura: {
      ...l,
      ar: soma(l.ar, salto.ar),
      solucao: soma(l.solucao, salto.solucao),
      fora: soma(l.fora, salto.fora),
    },
  }
}
