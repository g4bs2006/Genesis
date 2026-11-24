/**
 * Adaptador do simulador de brinquedo: implementa as portas FonteEstufa e
 * ControleSimulacao conversando com o Worker por mensagens. A tela não sabe
 * que existe um Worker; só vê as portas.
 */
import type { z } from 'zod'
import type { ControleSimulacao, EstadoRelogio, FonteEstufa } from '../../application/portas'
import { Estufa, Evento, Passo, ResumoCiclo } from '../../domain/contrato'
import { INSTANTE_INICIAL, type DoWorker, type ParaWorker, type Pedido, type RespostaDe } from './mensagens'

/**
 * Confere com o esquema Zod o que sai do Worker, mas só em desenvolvimento:
 * pega um campo errado cedo sem gastar tempo a cada passo em produção.
 */
function conferir<T>(esquema: z.ZodType<T>, dado: unknown): T {
  return import.meta.env.DEV ? esquema.parse(dado) : (dado as T)
}

type Pendente = { resolver: (dado: unknown) => void; rejeitar: (erro: Error) => void }

export function criarSimuladorBrinquedo(): FonteEstufa & ControleSimulacao {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  const enviar = (m: ParaWorker) => worker.postMessage(m)

  let relogio: EstadoRelogio = { pausado: false, velocidade: 1, instante: INSTANTE_INICIAL }
  const ultimos = new Map<string, Passo>()
  const assinantes = new Map<string, Set<(passo: Passo) => void>>()
  const assinantesRelogio = new Set<(estado: EstadoRelogio) => void>()
  const pendentes = new Map<number, Pendente>()
  let proximoId = 0

  worker.addEventListener('message', (ev: MessageEvent<DoWorker>) => {
    const m = ev.data
    if (m.tipo === 'estado') {
      relogio = m.relogio
      assinantesRelogio.forEach((f) => f(relogio))
      for (const bruto of m.passos) {
        const passo = conferir(Passo, bruto)
        ultimos.set(passo.leitura.estufaId, passo)
        assinantes.get(passo.leitura.estufaId)?.forEach((f) => f(passo))
      }
      return
    }
    const pendente = pendentes.get(m.id)
    pendentes.delete(m.id)
    if (m.tipo === 'resposta') pendente?.resolver(m.dados)
    else pendente?.rejeitar(new Error(m.erro))
  })
  // Se o Worker quebrar, quem espera resposta recebe o erro em vez de esperar para sempre.
  worker.addEventListener('error', (ev) => {
    pendentes.forEach((p) => p.rejeitar(new Error(`Simulador parou: ${ev.message}`)))
    pendentes.clear()
  })

  function pedir<K extends keyof RespostaDe>(
    pedido: Extract<Pedido, { tipo: K }>,
    esquema: z.ZodType<RespostaDe[K]>,
  ): Promise<RespostaDe[K]> {
    const id = proximoId++
    return new Promise((resolve, reject) => {
      pendentes.set(id, {
        resolver: (dado) => {
          try {
            resolve(conferir(esquema, dado))
          } catch (erro) {
            reject(erro instanceof Error ? erro : new Error(String(erro)))
          }
        },
        rejeitar: reject,
      })
      enviar({ tipo: 'pedir', id, pedido })
    })
  }

  return {
    listarEstufas: () => pedir({ tipo: 'estufas' }, Estufa.array()),
    historico: (estufaId, de, ate) => pedir({ tipo: 'historico', estufaId, de, ate }, Passo.array()),
    eventos: (estufaId) => pedir({ tipo: 'eventos', estufaId }, Evento.array()),
    resumoCiclo: (estufaId) => pedir({ tipo: 'resumo', estufaId }, ResumoCiclo),
    assinarPassos(estufaId, aoReceber) {
      const lista = assinantes.get(estufaId) ?? new Set()
      assinantes.set(estufaId, lista)
      lista.add(aoReceber)
      const ultimo = ultimos.get(estufaId)
      if (ultimo) aoReceber(ultimo) // o mais recente chega logo de cara
      return () => lista.delete(aoReceber)
    },

    relogio: () => relogio,
    assinarRelogio(aoMudar) {
      assinantesRelogio.add(aoMudar)
      return () => assinantesRelogio.delete(aoMudar)
    },
    pausar: () => enviar({ tipo: 'pausar' }),
    continuar: () => enviar({ tipo: 'continuar' }),
    acelerar: (velocidade) => enviar({ tipo: 'acelerar', velocidade }),
    pular: (minutos) => enviar({ tipo: 'pular', minutos }),
    injetar: (perturbacao) => enviar({ tipo: 'injetar', perturbacao }),
  }
}
