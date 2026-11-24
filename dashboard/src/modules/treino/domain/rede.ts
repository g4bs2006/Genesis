/**
 * A rede neural do agente, refeita no navegador para ser olhada por dentro
 * (docs/plano.md, "A rede neural"). Puro: sem React, sem tela.
 *
 * Aqui a rede só serve para explicar (o diagrama e "o que mais pesou"). As
 * ações de verdade vêm gravadas do treino: GPU e navegador arredondam
 * diferente, então a conta daqui pode diferir na última casa.
 */
import type { Atuador, Passo } from '@/modules/estufa/dominio'
import type { Modelo } from './contrato'

/**
 * Os valores "crus" que viram as entradas, nas unidades de sempre (°C, %, pH).
 * A tela de "mexer nas entradas" troca alguns deles e normaliza de novo.
 */
export type Brutos = {
  arTemperatura: number
  arUmidade: number
  arVpd: number
  arCo2: number
  arLuz: number
  ph: number
  ec: number
  temperaturaAgua: number
  nivel: number // 0..1
  foraTemperatura: number
  foraUmidade: number
  foraRadiacao: number
  hora: number // 0..24, hora local da estufa
  diaDoCiclo: number | null // null: a fonte não sabe (a entrada fica em 0)
  tarifa: number // R$/kWh
  // tendência: quanto cada leitura principal mudou na última hora
  variacaoTemperatura: number
  variacaoUmidade: number
  variacaoPh: number
  variacaoEc: number
}

export type GrupoEntrada = 'ar' | 'solução' | 'fora' | 'tempo' | 'tarifa' | 'tendência'

export type Entrada = {
  id: string
  rotulo: string
  grupo: GrupoEntrada
  /** do valor cru ao número que a rede enxerga (por volta de -1..1) */
  de: (b: Brutos) => number
}

/**
 * Centraliza e divide pela "largura normal" da variável: assim CO₂ (centenas
 * de ppm) e pH (unidades) chegam à rede do mesmo tamanho, e nenhuma domina só
 * por ter número grande. Corta em ±2 para um sensor maluco não gritar mais
 * alto que os outros.
 * shortcut: centros e escalas estimados aqui; quando o backend exportar a
 * normalização do treino, usar a dele.
 */
const escala = (centro: number, largura: number) => (v: number) => Math.max(-2, Math.min(2, (v - centro) / largura))

const temperatura = escala(22, 10)
const umidade = escala(70, 30)
const foraTemp = escala(22, 15)
const foraUmid = escala(60, 40)
const vpd = escala(0.85, 0.85)
const co2 = escala(700, 500)
const luz = escala(300, 300)
const ph = escala(6, 1)
const ec = escala(1.5, 1)
const agua = escala(21, 6)
const nivel = escala(0.5, 0.5)
const radiacao = escala(500, 500)
const tarifa = escala(0.9, 0.6)
const dia = escala(17.5, 17.5)

/** As 20 entradas, na ordem em que entram na rede. */
export const ENTRADAS: readonly Entrada[] = [
  { id: 'arTemperatura', rotulo: 'temperatura', grupo: 'ar', de: (b) => temperatura(b.arTemperatura) },
  { id: 'arUmidade', rotulo: 'umidade', grupo: 'ar', de: (b) => umidade(b.arUmidade) },
  { id: 'arVpd', rotulo: 'VPD', grupo: 'ar', de: (b) => vpd(b.arVpd) },
  { id: 'arCo2', rotulo: 'CO₂', grupo: 'ar', de: (b) => co2(b.arCo2) },
  { id: 'arLuz', rotulo: 'luz', grupo: 'ar', de: (b) => luz(b.arLuz) },
  { id: 'ph', rotulo: 'pH', grupo: 'solução', de: (b) => ph(b.ph) },
  { id: 'ec', rotulo: 'EC', grupo: 'solução', de: (b) => ec(b.ec) },
  { id: 'temperaturaAgua', rotulo: 'temp. da água', grupo: 'solução', de: (b) => agua(b.temperaturaAgua) },
  { id: 'nivel', rotulo: 'nível', grupo: 'solução', de: (b) => nivel(b.nivel) },
  { id: 'foraTemperatura', rotulo: 'temperatura', grupo: 'fora', de: (b) => foraTemp(b.foraTemperatura) },
  { id: 'foraUmidade', rotulo: 'umidade', grupo: 'fora', de: (b) => foraUmid(b.foraUmidade) },
  { id: 'foraRadiacao', rotulo: 'radiação', grupo: 'fora', de: (b) => radiacao(b.foraRadiacao) },
  // hora como seno e cosseno: num círculo, 23h fica perto de 0h (como número, ficaria longe)
  { id: 'horaSeno', rotulo: 'hora (seno)', grupo: 'tempo', de: (b) => Math.sin((2 * Math.PI * b.hora) / 24) },
  { id: 'horaCosseno', rotulo: 'hora (cosseno)', grupo: 'tempo', de: (b) => Math.cos((2 * Math.PI * b.hora) / 24) },
  {
    id: 'diaDoCiclo',
    rotulo: 'dia do ciclo',
    grupo: 'tempo',
    de: (b) => (b.diaDoCiclo == null ? 0 : dia(b.diaDoCiclo)),
  },
  { id: 'tarifa', rotulo: 'R$/kWh agora', grupo: 'tarifa', de: (b) => tarifa(b.tarifa) },
  // a MLP não tem memória: sem a variação, não saberia se a temperatura sobe ou desce
  {
    id: 'variacaoTemperatura',
    rotulo: 'Δ temperatura',
    grupo: 'tendência',
    de: (b) => clamp(b.variacaoTemperatura / 3),
  },
  { id: 'variacaoUmidade', rotulo: 'Δ umidade', grupo: 'tendência', de: (b) => clamp(b.variacaoUmidade / 15) },
  { id: 'variacaoPh', rotulo: 'Δ pH', grupo: 'tendência', de: (b) => clamp(b.variacaoPh / 0.3) },
  { id: 'variacaoEc', rotulo: 'Δ EC', grupo: 'tendência', de: (b) => clamp(b.variacaoEc / 0.3) },
]

function clamp(v: number) {
  return Math.max(-2, Math.min(2, v))
}

/** As 8 saídas, uma por atuador, na ordem da tabela do plano. */
export const SAIDAS: readonly { id: Atuador; rotulo: string }[] = [
  { id: 'exaustor', rotulo: 'exaustor' },
  { id: 'sombreamento', rotulo: 'sombreamento' },
  { id: 'nebulizacao', rotulo: 'nebulização' },
  { id: 'luz', rotulo: 'luz' },
  { id: 'dosagemAB', rotulo: 'dosagem A/B' },
  { id: 'dosagemAcido', rotulo: 'dosagem de ácido' },
  { id: 'reposicaoAgua', rotulo: 'reposição de água' },
  { id: 'bomba', rotulo: 'bomba' },
]

const HORA_MS = 60 * 60 * 1000

/**
 * Os valores crus a partir dos passos: o mais recente, e o de uma hora antes
 * para a tendência. Sem passo nenhum, devolve null.
 */
export function valoresBrutos(passos: Passo[], diaDoCiclo: number | null = null): Brutos | null {
  const atual = passos.at(-1)
  if (!atual) return null
  const t = Date.parse(atual.leitura.instante)
  // o passo mais perto de "uma hora atrás" (os passos são de 10 em 10 min, mas podem faltar)
  const antes = passos.reduce((a, p) =>
    Math.abs(Date.parse(p.leitura.instante) - (t - HORA_MS)) < Math.abs(Date.parse(a.leitura.instante) - (t - HORA_MS))
      ? p
      : a,
  )
  const l = atual.leitura
  const a = antes.leitura
  // a hora sai do próprio texto do instante (já está no fuso da estufa), não do fuso do computador
  const hora = Number(l.instante.slice(11, 13)) + Number(l.instante.slice(14, 16)) / 60
  return {
    arTemperatura: l.ar.temperatura,
    arUmidade: l.ar.umidade,
    arVpd: l.ar.vpd,
    arCo2: l.ar.co2,
    arLuz: l.ar.luz,
    ph: l.solucao.ph,
    ec: l.solucao.ec,
    temperaturaAgua: l.solucao.temperaturaAgua,
    nivel: l.solucao.nivel,
    foraTemperatura: l.fora.temperatura,
    foraUmidade: l.fora.umidade,
    foraRadiacao: l.fora.radiacao,
    hora,
    diaDoCiclo,
    tarifa: l.tarifaKwh,
    variacaoTemperatura: l.ar.temperatura - a.ar.temperatura,
    variacaoUmidade: l.ar.umidade - a.ar.umidade,
    variacaoPh: l.solucao.ph - a.solucao.ph,
    variacaoEc: l.solucao.ec - a.solucao.ec,
  }
}

/** Do cru ao vetor de 20 números que a rede recebe. */
export function normalizar(brutos: Brutos): number[] {
  return ENTRADAS.map((e) => e.de(brutos))
}

/** Atalho: os 20 números a partir dos passos (zeros, a entrada "neutra", sem passo). */
export function normalizarEntradas(passos: Passo[], diaDoCiclo: number | null = null): number[] {
  const b = valoresBrutos(passos, diaDoCiclo)
  return b ? normalizar(b) : ENTRADAS.map(() => 0)
}

/** Uma camada ligada à anterior: matriz entradas × saídas (linha por entrada) e vieses. */
export type Camada = { entradas: number; saidas: number; pesos: number[]; vieses: number[] }

/**
 * Fatia a lista plana de pesos em camadas, na ordem do contrato
 * (docs/contrato-dados.md): para cada camada, a matriz e depois os vieses.
 */
export function camadas(modelo: Pick<Modelo, 'arquitetura' | 'pesos'>): Camada[] {
  const arq = modelo.arquitetura
  const esperado = arq.slice(1).reduce((soma, saidas, i) => soma + arq[i]! * saidas + saidas, 0)
  if (modelo.pesos.length !== esperado)
    throw new Error(`A arquitetura [${arq.join(', ')}] pede ${esperado} pesos; vieram ${modelo.pesos.length}.`)
  const resultado: Camada[] = []
  let inicio = 0
  for (let c = 1; c < arq.length; c++) {
    const entradas = arq[c - 1]!
    const saidas = arq[c]!
    const pesos = modelo.pesos.slice(inicio, inicio + entradas * saidas)
    inicio += entradas * saidas
    const vieses = modelo.pesos.slice(inicio, inicio + saidas)
    inicio += saidas
    resultado.push({ entradas, saidas, pesos, vieses })
  }
  return resultado
}

const sigmoide = (x: number) => 1 / (1 + Math.exp(-x))

/**
 * Passa as entradas pela rede e devolve a ativação de cada camada (a primeira
 * é a própria entrada). Camadas do meio usam tanh (de -1 a 1, "entorta" a
 * conta para a rede não ser só uma reta); a última usa sigmoide (de 0 a 1,
 * vira "quanto ligar" cada atuador).
 */
export function propagar(modelo: Pick<Modelo, 'arquitetura' | 'pesos'>, entradas: number[]): number[][] {
  return propagarCamadas(camadas(modelo), entradas)
}

function propagarCamadas(cs: Camada[], entradas: number[]): number[][] {
  if (entradas.length !== cs[0]?.entradas)
    throw new Error(`A rede espera ${cs[0]?.entradas} entradas; vieram ${entradas.length}.`)
  const ativacoes = [entradas]
  cs.forEach((c, n) => {
    const anterior = ativacoes[n]!
    const ultima = n === cs.length - 1
    const saida = c.vieses.map((vies, j) => {
      // cada neurônio: soma de entrada × peso, mais o viés
      let soma = vies
      for (let i = 0; i < c.entradas; i++) soma += anterior[i]! * c.pesos[i * c.saidas + j]!
      return ultima ? sigmoide(soma) : Math.tanh(soma)
    })
    ativacoes.push(saida)
  })
  return ativacoes
}

/**
 * Quanto cada entrada empurrou uma saída: zera a entrada (o valor "neutro"),
 * roda a rede de novo e mede a diferença. Positivo: aquela entrada fez a saída
 * subir; negativo: segurou para baixo. É uma aproximação (as entradas se
 * misturam lá dentro), mas honesta e fácil de conferir.
 */
export function atribuicao(modelo: Pick<Modelo, 'arquitetura' | 'pesos'>, entradas: number[], saida: number): number[] {
  const cs = camadas(modelo)
  const valor = (x: number[]) => {
    const v = propagarCamadas(cs, x).at(-1)![saida]
    if (v === undefined) throw new Error(`A rede não tem a saída ${saida}.`)
    return v
  }
  const base = valor(entradas)
  return entradas.map((_, i) => base - valor(entradas.map((x, k) => (k === i ? 0 : x))))
}
