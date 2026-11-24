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

let promessa: Promise<DadosEstufaExemplo> | undefined
/**
 * Baixa e confere o arquivo só quando alguém pede (e uma vez só). O import()
 * dinâmico tira os ~400 KB do JSON do código que abre o app: ele vira um
 * pedaço separado, baixado na primeira leitura (e nunca, no modo dev).
 */
const carregar = () => (promessa ??= import('./estufas.json').then((m) => DadosEstufaExemplo.parse(m.default)))

/** Devolve o valor depois de um tempinho, como uma rede de verdade faria. */
const comAtraso = <T>(valor: (d: DadosEstufaExemplo) => T) =>
  carregar().then(
    (d) =>
      new Promise<T>((resolver, rejeitar) =>
        setTimeout(() => {
          try {
            resolver(valor(d))
          } catch (erro) {
            rejeitar(erro)
          }
        }, LATENCIA_MS),
      ),
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
    listarEstufas: () => comAtraso((d) => d.estufas),

    assinarPassos(estufaId, aoReceber) {
      let cancelado = false
      let id: ReturnType<typeof setInterval> | undefined
      void carregar().then((d) => {
        if (cancelado) return
        id = reprisar(d.passos[estufaId] ?? [], aoReceber)
      })
      return () => {
        cancelado = true
        clearInterval(id)
      }
    },

    historico: (estufaId, de, ate) =>
      comAtraso((d) => {
        const [inicio, fim] = [Date.parse(de), Date.parse(ate)]
        return (d.passos[estufaId] ?? []).filter((p) => {
          const t = Date.parse(p.leitura.instante)
          return t >= inicio && t <= fim
        })
      }),

    eventos: (estufaId) => comAtraso((d) => d.eventos.filter((e) => e.estufaId === estufaId)),

    resumoCiclo: (estufaId) =>
      comAtraso((d) => {
        const resumo = d.resumos.find((r) => r.estufaId === estufaId)
        if (!resumo) throw new Error(`Estufa sem resumo de ciclo: ${estufaId}`)
        return resumo
      }),
  }
}

/** Emite o passo mais recente e depois reprisa o dia gravado, um passo a cada poucos segundos. */
function reprisar(passos: Passo[], aoReceber: (p: Passo) => void): ReturnType<typeof setInterval> | undefined {
  const ultimo = passos.at(-1)
  if (!ultimo) return undefined
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
  return id
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
