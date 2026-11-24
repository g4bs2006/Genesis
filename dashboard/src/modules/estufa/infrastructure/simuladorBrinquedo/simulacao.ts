/**
 * A simulação contínua: três estufas de brinquedo lado a lado, no MESMO
 * clima, cada uma com um controlador (o campeão, as regras fixas e ninguém).
 * Traduz o núcleo para o contrato do dashboard (Passo, Evento, Estufa,
 * ResumoCiclo). Não sabe de relógio de parede nem de Worker: quem chama
 * decide quantos passos andar (worker.ts). Por isso dá para testar.
 */
import type {
  Acoes,
  Controlador,
  Estufa,
  Evento,
  Leitura,
  Passo,
  Perturbacao,
  ResumoCiclo,
} from '../../domain/contrato'
import { massaEsperada } from '../../domain/crescimento'
import { INSTANTE_INICIAL } from './mensagens'
import {
  avancarTemperatura,
  C_EXA,
  C_NEB,
  CAMPEAO,
  criarRng,
  decidirAcao,
  FMAX,
  FMIN,
  MIN_PASSO,
  novaMemoria,
  PASSOS,
  PASSOS_DIA,
  sortearClima,
  type Clima,
  type Rng,
  type TipoControle,
} from './nucleo'

const PASSO_MS = MIN_PASSO * 60_000
const INICIO_MS = Date.parse(INSTANTE_INICIAL)
const FUSO_MS = -3 * 3_600_000 // America/Sao_Paulo: -03:00 o ano todo (sem horário de verão desde 2019)

const DIA_INICIAL = 21
const DIAS_DO_CICLO = 35
const PLANTAS = 120
/** Até quantos eventos cada estufa guarda (os mais antigos saem). */
const MAX_EVENTOS = 200

/**
 * Hipóteses de unidade (o estudo só tem "custo", sem unidade):
 * - C_EXA e C_NEB viram kWh por passo de 10 min no máximo: exaustor de
 *   0,02 kWh/10 min = 120 W, nebulização 0,05 kWh/10 min = 300 W (a bomba de
 *   alta pressão). Assim energiaKwh = soma do custo de atuadores do estudo.
 * - Nebulização no máximo gasta 2 L por passo (12 L/h).
 */
const AGUA_L_POR_PASSO = 2
const TARIFA_KWH = 0.85 // R$/kWh, tarifa comum de exemplo
const TARIFA_PICO_KWH = 2.55 // 3× na tarifaDePico

/**
 * Quanto dura cada perturbação, em passos de 10 min. Efeito de cada uma:
 * - ondaDeCalor: ar de fora +6 °C.
 * - ruidoSensores: a leitura de temperatura (e o que o controlador vê) ganha
 *   ruído de desvio 1,5 °C; a temperatura de verdade não muda.
 * - tarifaDePico: tarifaKwh 3×. Não muda a física.
 * - quedaDeEnergia: exaustor e nebulização param (o pedido do controlador
 *   continua aparecendo em `acoes`, mas não faz efeito).
 * - phDescalibra: o pH de exemplo lê +1,2. Só muda o número de exemplo.
 * - bombaTrava: só vira Evento; o brinquedo não simula a solução nutritiva.
 */
const DURACAO: Record<Perturbacao, number> = {
  ondaDeCalor: 36,
  ruidoSensores: 36,
  tarifaDePico: 36,
  quedaDeEnergia: 12,
  phDescalibra: 36,
  bombaTrava: 36,
}
const TEXTO: Record<Perturbacao, [string, string]> = {
  ondaDeCalor: ['Onda de calor', 'Ar de fora 6 °C mais quente por 6 h.'],
  ruidoSensores: ['Ruído nos sensores', 'Leitura de temperatura com ruído de ±1,5 °C por 6 h.'],
  tarifaDePico: ['Tarifa de pico', 'Energia a R$ 2,55/kWh por 6 h.'],
  quedaDeEnergia: ['Queda de energia', 'Exaustor e nebulização parados por 2 h.'],
  phDescalibra: ['pH descalibrado', 'Sensor de pH (valor de exemplo) lendo +1,2 por 6 h.'],
  bombaTrava: ['Bomba travada', 'Só registro: a estufa de brinquedo não simula a solução nutritiva.'],
}

/** Campos da Leitura que o brinquedo não simula: valores de exemplo. */
const EXEMPLOS = [
  'ar.umidade',
  'ar.vpd',
  'ar.co2',
  'ar.luz',
  'solucao.ph',
  'solucao.ec',
  'solucao.temperaturaAgua',
  'solucao.nivel',
  'fora.umidade',
]

/** Instante ISO com fuso -03:00 do passo n (0 = início da simulação). */
export function instanteDoPasso(n: number): string {
  const local = new Date(INICIO_MS + n * PASSO_MS + FUSO_MS)
  return local.toISOString().slice(0, 19) + '-03:00'
}

const fmt = (t: number) => t.toFixed(1).replace('.', ',')

type EstadoEstufa = {
  id: string
  nome: string
  controlador: Controlador
  tipo: TipoControle
  pesos: Float64Array | null
  /** Temperatura de verdade do ar (°C). */
  t: number
  /** Anel com a temperatura da última hora (6 passos), como no núcleo. */
  ultimaHora: Float64Array
  dentro: boolean
  /** Últimas 24 h (144 passos), do mais antigo ao mais novo. */
  historico: Passo[]
  eventos: Evento[]
  // Somados desde o começo do ciclo (ou desde que o simulador ligou).
  passos: number
  passosFora: number
  energiaKwh: number
  aguaL: number
}

const ESTUFAS: [string, string, Controlador, TipoControle][] = [
  ['estufa-agente', 'Agente (campeão)', { tipo: 'agente', modeloId: 'campeao-estudo' }, 'rede'],
  ['estufa-regras', 'Regras fixas', { tipo: 'regras' }, 'regras'],
  ['estufa-nada', 'Sem controle', { tipo: 'nada' }, 'nada'],
]

export class Simulacao {
  private passo = 0 // passos já simulados
  private inicioCiclo = 0 // passo em que o ciclo atual começou
  private diaInicialCiclo = DIA_INICIAL
  private clima: Clima
  private passoNoClima = 0
  private ativas = new Map<Perturbacao, number>() // perturbação → passo em que acaba
  private rng: Rng
  private mem = novaMemoria()
  private estufas: EstadoEstufa[]

  constructor(semente = 42) {
    this.rng = criarRng(semente)
    this.clima = sortearClima(semente)
    const t0 = this.clima.tExt[0]! + 1 // como no estudo
    this.estufas = ESTUFAS.map(([id, nome, controlador, tipo]) => ({
      id,
      nome,
      controlador,
      tipo,
      pesos: tipo === 'rede' ? CAMPEAO : null,
      t: t0,
      ultimaHora: new Float64Array(6).fill(t0),
      dentro: t0 >= FMIN && t0 <= FMAX,
      historico: [],
      eventos: [],
      passos: 0,
      passosFora: 0,
      energiaKwh: 0,
      aguaL: 0,
    }))
    // Um passo logo de cara: sempre existe um "passo mais recente".
    this.avancar(1)
  }

  /** Instante do passo mais recente. */
  instante(): string {
    return instanteDoPasso(this.passo - 1)
  }

  avancar(n: number): void {
    for (let i = 0; i < n; i++) this.passoUm()
  }

  ultimosPassos(): Passo[] {
    return this.estufas.flatMap((e) => e.historico.slice(-1))
  }

  injetar(p: Perturbacao): void {
    this.ativas.set(p, this.passo + DURACAO[p])
    const [titulo, detalhe] = TEXTO[p]
    for (const e of this.estufas) {
      this.registrar(e, { estufaId: e.id, instante: this.instante(), tipo: 'perturbacao', titulo, detalhe })
    }
  }

  listarEstufas(): Estufa[] {
    return this.estufas.map((e) => ({
      id: e.id,
      nome: e.nome,
      origem: 'simulada',
      controlador: e.controlador,
      plantas: PLANTAS,
      diaDoCiclo: this.diaDoCiclo(),
      diasDoCiclo: DIAS_DO_CICLO,
      massaPorPe: massaEsperada(this.diaDoCiclo()) * this.fatorMassa(e),
    }))
  }

  historico(estufaId: string, de: string, ate: string): Passo[] {
    const [a, b] = [Date.parse(de), Date.parse(ate)]
    return this.achar(estufaId).historico.filter((p) => {
      const t = Date.parse(p.leitura.instante)
      return t >= a && t <= b
    })
  }

  eventos(estufaId: string): Evento[] {
    return [...this.achar(estufaId).eventos]
  }

  resumoCiclo(estufaId: string): ResumoCiclo {
    const e = this.achar(estufaId)
    const fora = this.fracaoFora(e)
    const dias = this.diaDoCiclo() - this.diaInicialCiclo
    return {
      estufaId,
      massaPorPe: massaEsperada(DIAS_DO_CICLO) * this.fatorMassa(e), // projetada para a colheita
      energiaKwh: e.energiaKwh,
      aguaL: e.aguaL,
      // Exemplos (o brinquedo não simula a solução): 0,03 g de adubo por pé
      // por dia e 2 ml de ácido por dia.
      nutrienteG: PLANTAS * 0.03 * dias,
      acidoMl: 2 * dias,
      foraDaFaixa: fora,
      foraPorVariavel: { temperatura: fora },
      barradas: 0,
    }
  }

  // ---------- por dentro ----------

  private passoUm(): void {
    // Fim dos 3 dias de clima: sorteia outro e segue (a temperatura de dentro continua).
    if (this.passoNoClima >= PASSOS) {
      this.clima = sortearClima(this.rng.int(1e9))
      this.passoNoClima = 0
    }
    if (this.diaDoCiclo() >= DIAS_DO_CICLO) this.novoCiclo()

    const instante = instanteDoPasso(this.passo)
    const p = this.passoNoClima
    const tExt = this.clima.tExt[p]! + (this.ativa('ondaDeCalor') ? 6 : 0)
    const sol = this.clima.sol[p]!
    const hora = this.clima.hora[p]!
    const k = this.passo % 6
    const semEnergia = this.ativa('quedaDeEnergia')

    for (const e of this.estufas) {
      this.conferirFaixa(e, instante)
      // O controlador decide pelo que o sensor lê (que pode ter ruído).
      const lida = e.t + (this.ativa('ruidoSensores') ? this.rng.normal() * 1.5 : 0)
      const [exa, neb] = decidirAcao(e.tipo, e.pesos, 0, lida, e.ultimaHora[k]!, tExt, sol, hora, this.mem)
      const acoes: Acoes = {
        exaustor: exa,
        nebulizacao: neb,
        sombreamento: 0,
        luz: 0,
        dosagemAB: 0,
        dosagemAcido: 0,
        reposicaoAgua: false,
        bomba: true,
      }
      e.historico.push({ leitura: this.leitura(e.id, instante, lida, tExt, sol, hora), acoes, barradas: [] })
      if (e.historico.length > PASSOS_DIA) e.historico.shift()

      const [exaReal, nebReal] = semEnergia ? [0, 0] : [exa, neb]
      e.passos++
      if (!e.dentro) e.passosFora++
      e.energiaKwh += C_EXA * exaReal + C_NEB * nebReal
      e.aguaL += AGUA_L_POR_PASSO * nebReal
      e.t = avancarTemperatura(e.t, tExt, sol, exaReal, nebReal)
      e.ultimaHora[k] = e.t
    }
    this.passo++
    this.passoNoClima++
  }

  /** Saiu da faixa: 'erro'. Voltou: 'acerto'. Usa a temperatura de verdade. */
  private conferirFaixa(e: EstadoEstufa, instante: string): void {
    const dentro = e.t >= FMIN && e.t <= FMAX
    if (dentro === e.dentro) return
    e.dentro = dentro
    const base = { estufaId: e.id, instante, variavel: 'temperatura', passo: this.passo }
    if (dentro) {
      this.registrar(e, { ...base, tipo: 'acerto', titulo: 'Ar voltou para a faixa', detalhe: `${fmt(e.t)} °C` })
    } else {
      const limite = e.t > FMAX ? `acima de ${FMAX} °C` : `abaixo de ${FMIN} °C`
      this.registrar(e, { ...base, tipo: 'erro', titulo: 'Ar saiu da faixa', detalhe: `${fmt(e.t)} °C, ${limite}` })
    }
  }

  private registrar(e: EstadoEstufa, ev: Evento): void {
    e.eventos.push(ev)
    if (e.eventos.length > MAX_EVENTOS) e.eventos.shift()
  }

  /**
   * A Leitura do contrato. Temperatura do ar, de fora e radiação vêm da
   * simulação; o resto são exemplos plausíveis que variam devagar com a hora
   * (listados em `exemplos`, para a tela mostrar o selo).
   */
  private leitura(estufaId: string, instante: string, t: number, tExt: number, sol: number, hora: number): Leitura {
    const ang = (2 * Math.PI * hora) / 24 // cos = 1 à meia-noite
    const umidade = 70 + 8 * Math.cos(ang) // mais úmido de madrugada
    // VPD = pressão de saturação (fórmula de Tetens, kPa) × fração que falta para saturar
    const vpd = 0.6108 * Math.exp((17.27 * t) / (t + 237.3)) * (1 - umidade / 100)
    return {
      estufaId,
      instante,
      ar: { temperatura: t, umidade, vpd: Math.max(0, vpd), co2: 420 + 60 * Math.cos(ang), luz: 550 * sol },
      solucao: {
        ph: 6 + 0.1 * Math.sin(ang) + (this.ativa('phDescalibra') ? 1.2 : 0),
        ec: 1.5 + 0.05 * Math.sin(ang),
        temperaturaAgua: 21 - 1.5 * Math.cos(ang),
        nivel: 0.8,
      },
      fora: { temperatura: tExt, umidade: 65 + 15 * Math.cos(ang), radiacao: 900 * sol },
      tarifaKwh: this.ativa('tarifaDePico') ? TARIFA_PICO_KWH : TARIFA_KWH,
      exemplos: EXEMPLOS,
    }
  }

  private ativa(p: Perturbacao): boolean {
    return (this.ativas.get(p) ?? 0) > this.passo
  }

  private diaDoCiclo(): number {
    return this.diaInicialCiclo + (this.passo - this.inicioCiclo) / PASSOS_DIA
  }

  /** Colheita: começa um ciclo novo no dia 0 e zera os consumos. */
  private novoCiclo(): void {
    this.inicioCiclo = this.passo
    this.diaInicialCiclo = 0
    for (const e of this.estufas) Object.assign(e, { passos: 0, passosFora: 0, energiaKwh: 0, aguaL: 0 })
  }

  private fracaoFora(e: EstadoEstufa): number {
    return e.passos ? e.passosFora / e.passos : 0
  }

  /**
   * shortcut: a massa é a curva de referência reduzida até 20% pelo tempo fora
   * da faixa; não é um modelo de crescimento. Troca quando o simulador de
   * verdade (Van Henten) existir.
   */
  private fatorMassa(e: EstadoEstufa): number {
    return 1 - 0.2 * this.fracaoFora(e)
  }

  private achar(estufaId: string): EstadoEstufa {
    const e = this.estufas.find((x) => x.id === estufaId)
    if (!e) throw new Error(`Estufa desconhecida: ${estufaId}`)
    return e
  }
}
