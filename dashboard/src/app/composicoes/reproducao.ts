/**
 * Reprodução de gravações: o relógio compartilhado e o que se tira de uma
 * gravação (eventos, instante mais próximo, link). Tudo puro: a tela só chama.
 *
 * Por que reproduzir e não recalcular? As ações de cada passo vêm gravadas do
 * treino (GPU em float32). O navegador arredondaria diferente e, passo a passo,
 * a estufa "reproduzida" se afastaria da real. Com as ações gravadas, a
 * reprodução é fiel (docs/plano.md, "Mostrar a evolução").
 *
 * O relógio é uma máquina de estados: cada função recebe o estado e devolve um
 * estado novo, sem mexer no antigo. Assim dá para testar sem navegador e o
 * React percebe a mudança (objeto novo = render novo).
 */
import { estadoDaVariavel, FAIXAS, VARIAVEIS_COM_ESTADO, type Passo } from '@/modules/estufa/dominio'
import { normalizarEntradas, propagar, SAIDAS, type Modelo } from '@/modules/treino/dominio'

export const VELOCIDADES = [1, 10, 60, 360] as const
export type Velocidade = (typeof VELOCIDADES)[number]

/**
 * Quantos passos por segundo cada velocidade anda. A proporção entre elas é a
 * do rótulo (360× anda 360 vezes mais que 1×), mas a base é 1 passo a cada 6 s:
 * em 1× dá para acompanhar ação por ação; em 360× (60 passos/s) o ciclo de
 * 840 passos passa em ~14 s.
 */
export const passosPorSegundo = (v: Velocidade) => v / 6

export type EstadoReproducao = {
  /** Posição em passos. Fracionária: o relógio anda um pouco a cada quadro e a tela mostra Math.floor. */
  posicao: number
  tocando: boolean
  velocidade: Velocidade
}

export const criarReproducao = (posicao = 0): EstadoReproducao => ({ posicao, tocando: false, velocidade: 60 })

/** O passo que a tela mostra agora. */
export const passoAtual = (e: EstadoReproducao) => Math.floor(e.posicao)

const limitar = (posicao: number, total: number) => Math.min(Math.max(0, posicao), Math.max(0, total - 1))

/**
 * Um quadro do relógio: `ms` milissegundos se passaram. Ao chegar no último
 * passo, para lá (sem dar a volta: o ciclo acabou, a alface foi colhida).
 */
export function avancar(e: EstadoReproducao, ms: number, total: number): EstadoReproducao {
  if (!e.tocando) return e
  const posicao = limitar(e.posicao + (ms / 1000) * passosPorSegundo(e.velocidade), total)
  return { ...e, posicao, tocando: posicao < total - 1 }
}

/** Tocar/pausar. Tocar no fim recomeça do início (como um player de vídeo). */
export function alternar(e: EstadoReproducao, total: number): EstadoReproducao {
  if (e.tocando) return { ...e, tocando: false }
  return { ...e, tocando: total > 1, posicao: passoAtual(e) >= total - 1 ? 0 : e.posicao }
}

/** Pular para um passo (a régua, um evento, o link). */
export const buscar = (e: EstadoReproducao, passo: number, total: number): EstadoReproducao => ({
  ...e,
  posicao: limitar(Math.round(passo), total),
})

/** Setas do teclado: anda passos inteiros a partir do passo mostrado. */
export const andar = (e: EstadoReproducao, delta: number, total: number) => buscar(e, passoAtual(e) + delta, total)

export const mudarVelocidade = (e: EstadoReproducao, velocidade: Velocidade): EstadoReproducao => ({ ...e, velocidade })

/** Índice do evento mais perto da posição (empate: o primeiro). -1 sem eventos. */
export function eventoMaisProximo(eventos: readonly { passo: number }[], posicao: number): number {
  let melhor = -1
  eventos.forEach((ev, i) => {
    if (melhor < 0 || Math.abs(ev.passo - posicao) < Math.abs(eventos[melhor]!.passo - posicao)) melhor = i
  })
  return melhor
}

export type EventoGravacao = { passo: number; tipo: 'saiu' | 'barrada'; texto: string }

const NOME_ATUADOR: Record<string, string> = {
  exaustor: 'o exaustor',
  nebulizacao: 'a nebulização',
  sombreamento: 'o sombreamento',
  luz: 'a luz',
  dosagemAB: 'a dose de nutriente',
  dosagemAcido: 'a dose de ácido',
  reposicaoAgua: 'a reposição de água',
  bomba: 'a bomba',
}

/**
 * Os momentos que valem um pulo: quando uma variável SAI da faixa (a
 * passagem de ok para fora, não cada passo fora; senão a lista teria
 * centenas de linhas iguais) e quando a segurança barrou uma ação.
 */
export function eventosDaGravacao(passos: readonly Passo[]): EventoGravacao[] {
  const eventos: EventoGravacao[] = []
  passos.forEach((p, i) => {
    const anterior = passos[i - 1]
    for (const v of VARIAVEIS_COM_ESTADO) {
      // só a entrada em risco conta: "atenção" na beira da faixa daria centenas de eventos
      const agora = estadoDaVariavel(p, v)
      if (agora === 'risco' && (!anterior || estadoDaVariavel(anterior, v) !== 'risco'))
        eventos.push({ passo: i, tipo: 'saiu', texto: `${FAIXAS[v].nome} saiu da faixa` })
    }
    for (const b of p.barradas)
      eventos.push({ passo: i, tipo: 'barrada', texto: `Segurança barrou ${NOME_ATUADOR[b.atuador] ?? b.atuador}` })
  })
  return eventos
}

const DIA_MS = 24 * 60 * 60 * 1000

/** Dia do ciclo (fracionário) do passo `i`, contado do primeiro passo da gravação. */
export function diaDoPasso(passos: readonly Passo[], i: number): number {
  const primeiro = passos[0]
  const p = passos[Math.min(i, passos.length - 1)]
  if (!primeiro || !p) return 0
  return (Date.parse(p.leitura.instante) - Date.parse(primeiro.leitura.instante)) / DIA_MS
}

/**
 * O passo mais perto de um instante (vindo de um evento da página Modelo).
 * Dentro da gravação: o mais perto no tempo. Fora dela: o mesmo horário do
 * dia no primeiro dia da gravação (o que importa é "às 14h", não a data).
 */
export function passoDoInstante(passos: readonly Passo[], instante: string): number {
  const tempos = passos.map((p) => Date.parse(p.leitura.instante))
  const inicio = tempos[0]
  const fim = tempos.at(-1)
  let alvo = Date.parse(instante)
  if (inicio === undefined || fim === undefined || Number.isNaN(alvo)) return 0
  if (alvo < inicio || alvo > fim) alvo = inicio + ((((alvo - inicio) % DIA_MS) + DIA_MS) % DIA_MS)
  let melhor = 0
  tempos.forEach((t, i) => {
    if (Math.abs(t - alvo) < Math.abs(tempos[melhor]! - alvo)) melhor = i
  })
  return melhor
}

export const MAXIMO_LADO_A_LADO = 4

/** Lê `?gravacoes=a,b&t=120&evento=<ISO>` (o link copiado ou o pulo da página Modelo). */
export function lerParametros(busca: URLSearchParams): { ids: string[]; t: number | null; evento: string | null } {
  const ids = [
    ...new Set(
      (busca.get('gravacoes') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAXIMO_LADO_A_LADO)
  const t = Number(busca.get('t'))
  return {
    ids,
    t: busca.has('t') && Number.isInteger(t) && t >= 0 ? t : null,
    evento: busca.get('evento'),
  }
}

/** O contrário de lerParametros: a parte "?..." do link deste instante. */
export const montarBusca = (ids: readonly string[], passo: number) =>
  `?gravacoes=${ids.map(encodeURIComponent).join(',')}&t=${passo}`

/**
 * A rede no passo `i` de uma gravação, recalculada no navegador, e onde ela
 * discorda da ação que foi gravada.
 *
 * Por que só ilustração: o treino roda na placa de vídeo em float32 e o
 * navegador conta em float64; os arredondamentos diferem (docs/contrato-dados.md).
 * As ações mostradas na reprodução continuam sendo as gravadas. O diagrama só
 * mostra por onde o sinal passou; se a saída recalculada se afasta da gravada
 * mais que a tolerância, a diferença não é arredondamento (modelo trocado,
 * entrada diferente) e a tela avisa.
 *
 * Só os 4 atuadores do ar são comparados: neles a saída da rede (0 a 1) É a
 * ação gravada. Dosagens (ml), reposição e bomba (liga/desliga) ainda não têm
 * a conversão definida no simulador (a fase 1 só controla o ar).
 */
export const TOLERANCIA_REDE = 0.05
const COMPARAVEIS = ['exaustor', 'sombreamento', 'nebulizacao', 'luz'] as const
// a tendência olha uma hora para trás: 10 passos de 10 min bastam (com folga)
const JANELA_TENDENCIA = 10

export type Divergencia = { saida: number; gravado: number; recalculado: number }

export function fluxoNoPasso(
  modelo: Pick<Modelo, 'arquitetura' | 'pesos'>,
  passos: readonly Passo[],
  i: number,
): { ativacoes: number[][]; divergencias: Divergencia[] } {
  const janela = passos.slice(Math.max(0, i - JANELA_TENDENCIA), i + 1)
  const ativacoes = propagar(modelo, normalizarEntradas(janela, diaDoPasso(passos, i)))
  const saidas = ativacoes.at(-1) ?? []
  const passo = passos[i]
  const divergencias: Divergencia[] = []
  if (passo) {
    for (const atuador of COMPARAVEIS) {
      // a camada de segurança pode ter mudado a ação: aí a diferença é esperada
      if (passo.barradas.some((b) => b.atuador === atuador)) continue
      const saida = SAIDAS.findIndex((s) => s.id === atuador)
      const recalculado = saidas[saida] ?? 0
      const gravado = passo.acoes[atuador]
      if (Math.abs(recalculado - gravado) > TOLERANCIA_REDE) divergencias.push({ saida, gravado, recalculado })
    }
  }
  return { ativacoes, divergencias }
}
