/**
 * Adaptador "reprodução" das portas FonteEstufa e ControleSimulacao (passo 10).
 *
 * Ainda não existe estufa de verdade. O "ao vivo" do app passa a ser uma
 * gravação REAL do treino (um campeão, as regras fixas ou "sem controle"
 * cultivando 35 dias no simulador), tocada acelerada do dia 0 ao fim e de novo,
 * em ciclo. Nenhum número é inventado: cada leitura, ação, massa e consumo vem
 * da gravação (decisão 0007).
 *
 * Um relógio só para todas as gravações: todas usam o mesmo clima, então no
 * mesmo passo elas viveram exatamente o mesmo tempo lá fora (Estufas lado a
 * lado compara de verdade). O relógio anda em "passos por segundo": 6 = uma
 * hora de estufa por segundo de tela.
 *
 * O módulo estufa não conhece o treino: quem entrega as gravações é uma
 * FonteDeGravacoes (o app liga a do treino a ela em dependencias.ts).
 */
import type { ControleSimulacao, EstadoRelogio, FonteEstufa } from '../../application/portas'
import type { Controlador, Estufa, Passo, ResumoCiclo } from '../../domain/contrato'
import { massaNoDia } from '../../domain/crescimento'
import { eventosDosPassos } from '../../domain/eventos'

export type ResumoParaReproduzir = {
  id: string
  modeloId: string
  controlador?: 'agente' | 'regras' | 'nada'
  geracao?: number | null
  passos: number
}
export type GravacaoParaReproduzir = { passos: Passo[]; massaPorDia?: number[]; resumo?: ResumoCiclo }
export interface FonteDeGravacoes {
  listar(): Promise<ResumoParaReproduzir[]>
  obter(id: string): Promise<GravacaoParaReproduzir>
}

/** pés por estufa: os mesmos 1000 do simulador do treino (controle/metricas.py, PLANTAS) */
export const PLANTAS_POR_ESTUFA = 1000
const PASSOS_POR_DIA = 144 // passos de 10 min
const DIA_MS = 24 * 60 * 60 * 1000
/** um passo atrasado demais (aba em segundo plano) não vira uma enxurrada de passos */
const MAXIMO_POR_QUADRO = 288

export const VELOCIDADE_PADRAO = 6 // uma hora de estufa por segundo de tela

/** O nome curto de cada estufa (o modo Desenvolvedor mostra; o Produtor, não). */
export function nomeDaGravacao(r: ResumoParaReproduzir): string {
  if (r.controlador === 'regras') return 'Regras fixas'
  if (r.controlador === 'nada') return 'Sem controle'
  return r.geracao != null ? `Geração ${r.geracao}` : r.modeloId
}

function controladorDe(r: ResumoParaReproduzir): Controlador {
  if (r.controlador === 'regras') return { tipo: 'regras' }
  if (r.controlador === 'nada') return { tipo: 'nada' }
  return { tipo: 'agente', modeloId: r.modeloId }
}

type Opcoes = {
  intervaloMs?: number
  agora?: () => number
  velocidade?: number
  /** em que passo o relógio começa (o modo demo começa no meio do recorte, com gráficos cheios) */
  posicao?: number
}

export function criarFonteEstufaReproducao(
  fonte: FonteDeGravacoes,
  {
    intervaloMs = 100,
    agora = () => performance.now(),
    velocidade = VELOCIDADE_PADRAO,
    posicao: inicio = 0,
  }: Opcoes = {},
): FonteEstufa & ControleSimulacao {
  let lista: Promise<ResumoParaReproduzir[]> | undefined
  const listar = () => (lista ??= fonte.listar())
  const carregadas = new Map<string, GravacaoParaReproduzir>()
  const carregando = new Map<string, Promise<GravacaoParaReproduzir>>()
  const carregar = (id: string) => {
    let p = carregando.get(id)
    if (!p) {
      p = fonte.obter(id).then((g) => (carregadas.set(id, g), g))
      // falhou (rede): esquece, para a próxima tentativa pedir de novo
      p.catch(() => carregando.delete(id))
      carregando.set(id, p)
    }
    return p
  }

  // ---- o relógio ----
  let posicao = inicio // em passos, fracionária
  let tocando = true
  let passosPorSegundo = velocidade
  let ultimoQuadro = agora()
  const assinantes = new Map<string, Set<(p: Passo) => void>>()
  const assinantesRelogio = new Set<(e: EstadoRelogio) => void>()
  const assinantesEstufas = new Set<(e: Estufa[]) => void>()

  /** quantos passos tem o ciclo: o maior entre as gravações carregadas */
  const total = () => Math.max(1, ...[...carregadas.values()].map((g) => g.passos.length))
  const indiceEm = (g: GravacaoParaReproduzir, pos: number) => Math.floor(pos) % g.passos.length
  const instanteAgora = () => {
    const g = carregadas.values().next().value
    return g ? (g.passos[indiceEm(g, posicao)]?.leitura.instante ?? '') : ''
  }
  const estado = (): EstadoRelogio => ({ pausado: !tocando, velocidade: passosPorSegundo, instante: instanteAgora() })
  const avisarRelogio = () => assinantesRelogio.forEach((f) => f(estado()))

  function emitir(antes: number, depois: number) {
    for (const [id, fs] of assinantes) {
      const g = carregadas.get(id)
      if (!g || fs.size === 0) continue
      const de = Math.floor(antes)
      const ate = Math.floor(depois)
      // do passo seguinte ao último mostrado até o de agora (dando a volta no fim do ciclo)
      const n = Math.min(ate - de, MAXIMO_POR_QUADRO)
      for (let k = ate - n + 1; k <= ate; k++) {
        const p = g.passos[k % g.passos.length]!
        fs.forEach((f) => f(p))
      }
    }
  }

  async function estufas(): Promise<Estufa[]> {
    return (await listar()).map((r) => {
      const g = carregadas.get(r.id)
      const passos = g?.passos.length ?? r.passos
      const dia = g ? diaDoPasso(g.passos, indiceEm(g, posicao)) : (Math.floor(posicao) % passos) / PASSOS_POR_DIA
      return {
        id: r.id,
        nome: nomeDaGravacao(r),
        origem: 'simulada',
        controlador: controladorDe(r),
        plantas: PLANTAS_POR_ESTUFA,
        diaDoCiclo: dia,
        // a massa por dia conhece o ciclo inteiro (num recorte, os passos não)
        diasDoCiclo: g?.massaPorDia ? g.massaPorDia.length - 1 : Math.round(passos / PASSOS_POR_DIA),
        massaPorPe: g?.massaPorDia ? massaNoDia(g.massaPorDia, dia) : 0,
        ...(g?.massaPorDia && { massaPorDia: g.massaPorDia }),
      } satisfies Estufa
    })
  }
  const avisarEstufas = () => {
    if (assinantesEstufas.size) void estufas().then((e) => assinantesEstufas.forEach((f) => f(e)))
  }

  let quadros = 0
  setInterval(() => {
    const t = agora()
    const dt = Math.min(1, (t - ultimoQuadro) / 1000)
    ultimoQuadro = t
    if (!tocando || carregadas.size === 0) return
    const antes = posicao
    // arredonda em 6 casas: somar 0,6 muitas vezes daria 143,99999 em vez de 144
    posicao = Math.round((posicao + dt * passosPorSegundo) * 1e6) / 1e6
    emitir(antes, posicao)
    if (posicao >= total()) posicao -= total() // o ciclo acabou: recomeça do transplante
    avisarRelogio()
    // dia e massa mudam devagar: a lista de estufas é avisada 2 vezes por segundo
    if (++quadros % Math.max(1, Math.round(500 / intervaloMs)) === 0) avisarEstufas()
  }, intervaloMs)

  const passosAteAgora = async (id: string) => {
    const g = await carregar(id)
    return g.passos.slice(0, indiceEm(g, posicao) + 1)
  }

  return {
    listarEstufas: estufas,
    assinarEstufas(aoMudar) {
      assinantesEstufas.add(aoMudar)
      return () => assinantesEstufas.delete(aoMudar)
    },
    assinarPassos(estufaId, aoReceber) {
      const fs = assinantes.get(estufaId) ?? new Set()
      assinantes.set(estufaId, fs)
      fs.add(aoReceber)
      let ativo = true
      void carregar(estufaId).then((g) => {
        if (!ativo) return
        aoReceber(g.passos[indiceEm(g, posicao)]!) // o passo de agora chega logo de cara
        avisarRelogio()
        avisarEstufas()
      })
      return () => {
        ativo = false
        fs.delete(aoReceber)
      }
    },
    async historico(estufaId, de, ate) {
      const [inicio, fim] = [Date.parse(de), Date.parse(ate)]
      return (await passosAteAgora(estufaId)).filter((p) => {
        const t = Date.parse(p.leitura.instante)
        return t >= inicio && t <= fim
      })
    },
    eventos: async (estufaId) => eventosDosPassos(await passosAteAgora(estufaId), estufaId),
    async resumoCiclo(estufaId) {
      const g = await carregar(estufaId)
      if (!g.resumo) throw new Error(`A gravação ${estufaId} não tem o resumo do ciclo (é anterior ao passo 09).`)
      return { ...g.resumo, estufaId }
    },

    relogio: estado,
    assinarRelogio(aoMudar) {
      assinantesRelogio.add(aoMudar)
      return () => assinantesRelogio.delete(aoMudar)
    },
    pausar: () => ((tocando = false), avisarRelogio()),
    continuar: () => ((tocando = true), (ultimoQuadro = agora()), avisarRelogio()),
    acelerar: (v) => ((passosPorSegundo = v), avisarRelogio()),
  }
}

/** Dia do ciclo (fracionário) do passo i, contado do primeiro passo da gravação. */
function diaDoPasso(passos: readonly Passo[], i: number): number {
  const primeiro = passos[0]
  const p = passos[i]
  if (!primeiro || !p) return 0
  return (Date.parse(p.leitura.instante) - Date.parse(primeiro.leitura.instante)) / DIA_MS
}
