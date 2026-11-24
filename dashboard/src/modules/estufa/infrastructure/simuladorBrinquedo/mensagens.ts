/**
 * O que a tela e o Worker dizem um ao outro. Um Web Worker é um JavaScript
 * que roda numa linha separada do navegador: o simulador anda lá, e a tela
 * não engasga. Os dois só conversam por mensagens (postMessage), então o
 * formato delas fica aqui, num só lugar, para os dois lados concordarem.
 */
import type { EstadoRelogio } from '../../application/portas'
import type { Estufa, Evento, Passo, Perturbacao, ResumoCiclo } from '../../domain/contrato'

/** O simulador começa à meia-noite de 23/11/2026, no dia 21 do ciclo. */
export const INSTANTE_INICIAL = '2026-11-23T00:00:00-03:00'

/** Perguntas que esperam resposta (viram Promise no adaptador). */
export type Pedido =
  | { tipo: 'estufas' }
  | { tipo: 'historico'; estufaId: string; de: string; ate: string }
  | { tipo: 'eventos'; estufaId: string }
  | { tipo: 'resumo'; estufaId: string }

/** O tipo da resposta de cada pedido. */
export type RespostaDe = {
  estufas: Estufa[]
  historico: Passo[]
  eventos: Evento[]
  resumo: ResumoCiclo
}

/** Tela → Worker. */
export type ParaWorker =
  | { tipo: 'pausar' }
  | { tipo: 'continuar' }
  | { tipo: 'acelerar'; velocidade: number }
  | { tipo: 'pular'; minutos: number }
  | { tipo: 'injetar'; perturbacao: Perturbacao }
  | { tipo: 'pedir'; id: number; pedido: Pedido }

/** Worker → tela. 'estado' chega a cada avanço do relógio (e quando ele muda). */
export type DoWorker =
  | { tipo: 'estado'; relogio: EstadoRelogio; passos: Passo[] }
  | { tipo: 'resposta'; id: number; dados: RespostaDe[keyof RespostaDe] }
  | { tipo: 'falha'; id: number; erro: string }
