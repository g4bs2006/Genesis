/**
 * O Web Worker do simulador de brinquedo: dá corda no relógio e responde aos
 * pedidos da tela. A conta mesmo mora em simulacao.ts e nucleo.ts.
 *
 * Relógio: a cada 100 ms soma velocidade × 0,1 passos num acumulador e anda
 * os passos inteiros. Velocidade 1 = um passo de 10 min por segundo de tela.
 */
import type { DoWorker, ParaWorker, Pedido, RespostaDe } from './mensagens'
import { Simulacao } from './simulacao'

const TICK_MS = 100
const VELOCIDADE_MAX = 1000 // passos por segundo
const PULO_MAX_MIN = 30 * 24 * 60 // um pulo de no máximo 30 dias, para o Worker não travar

const sim = new Simulacao()
let pausado = false
let velocidade = 1
let acumulado = 0

const enviar = (m: DoWorker) => self.postMessage(m)
const enviarEstado = () =>
  enviar({
    tipo: 'estado',
    relogio: { pausado, velocidade, instante: sim.instante() },
    passos: sim.ultimosPassos(),
  })

function responder(p: Pedido): RespostaDe[keyof RespostaDe] {
  switch (p.tipo) {
    case 'estufas':
      return sim.listarEstufas()
    case 'historico':
      return sim.historico(p.estufaId, p.de, p.ate)
    case 'eventos':
      return sim.eventos(p.estufaId)
    case 'resumo':
      return sim.resumoCiclo(p.estufaId)
  }
}

self.addEventListener('message', (ev: MessageEvent<ParaWorker>) => {
  const m = ev.data
  switch (m.tipo) {
    case 'pausar':
      pausado = true
      break
    case 'continuar':
      pausado = false
      break
    case 'acelerar':
      if (Number.isFinite(m.velocidade) && m.velocidade > 0) velocidade = Math.min(m.velocidade, VELOCIDADE_MAX)
      break
    case 'pular':
      if (Number.isFinite(m.minutos) && m.minutos > 0) sim.avancar(Math.round(Math.min(m.minutos, PULO_MAX_MIN) / 10))
      break
    case 'injetar':
      sim.injetar(m.perturbacao)
      break
    case 'pedir':
      try {
        enviar({ tipo: 'resposta', id: m.id, dados: responder(m.pedido) })
      } catch (erro) {
        enviar({ tipo: 'falha', id: m.id, erro: erro instanceof Error ? erro.message : String(erro) })
      }
      return // pedido não muda o estado
  }
  enviarEstado()
})

setInterval(() => {
  if (pausado) return
  acumulado += (velocidade * TICK_MS) / 1000
  const n = Math.floor(acumulado)
  if (n === 0) return
  acumulado -= n
  sim.avancar(n)
  enviarEstado()
}, TICK_MS)

enviarEstado()
