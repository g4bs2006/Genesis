/**
 * Núcleo da estufa de brinquedo: a mesma conta de estudo/rede-da-estufa.html
 * (e de estudo/*.py), portada para TypeScript. Tudo aqui é puro: sem tela, sem
 * relógio, sem Worker. Dá para testar com Vitest e rodar em qualquer lugar.
 *
 * A estufa de brinquedo tem uma só variável (temperatura do ar), dois
 * atuadores (exaustor e nebulização) e uma rede neural de 146 pesos. O
 * simulador anda em passos de 10 minutos; 3 dias = 432 passos.
 */

// ---------- Constantes da estufa (iguais às do estudo) ----------

/** Minutos de um passo. */
export const MIN_PASSO = 10
/** Passos em um dia: 24 h × 6 passos por hora. */
export const PASSOS_DIA = 144
/** Dias de um clima sorteado. */
export const DIAS = 3
/** Passos de um clima inteiro (3 dias). */
export const PASSOS = DIAS * PASSOS_DIA

/** Faixa boa da alface para o ar (°C): fora dela a nota cai. */
export const FMIN = 18
export const FMAX = 26

// Física de brinquedo: fração da diferença dentro/fora que se troca por passo.
const TROCA_PASSIVA = 0.02 // frestas: sempre troca um pouco de ar
const TROCA_EXAUSTOR = 0.15 // exaustor no máximo troca muito mais
const AQUECE_SOL = 0.35 // °C por passo com sol pleno
const ESFRIA_NEBULIZ = 1.5 // °C por passo com nebulização no máximo

// A nota é menos o custo: cada grau fora da faixa custa 1; cada passo de
// atuador ligado no máximo custa um pouco (é a "conta de luz" do brinquedo).
const C_FORA = 1.0
export const C_EXA = 0.02
export const C_NEB = 0.05

// ---------- Formato da rede: 6 entradas → 16 ocultos → 2 saídas ----------

/** Entradas: o que a rede "vê" (veja `observar`). */
export const NE = 6
/** Neurônios ocultos: a camada do meio, onde a rede monta suas "ideias". */
export const NH = 16
/** Saídas: exaustor e nebulização, cada uma de 0 a 1. */
export const NS = 2
/**
 * Número de pesos de uma rede: pesos da 1ª camada (6×16) + vieses (16) +
 * pesos da 2ª camada (16×2) + vieses (2) = 146. Viés é um número somado ao
 * neurônio, para ele poder "ligar" mesmo com entradas zero.
 */
export const NP = NE * NH + NH + NH * NS + NS
// Onde cada pedaço começa dentro da lista de 146 números.
const OFF_B1 = NE * NH
const OFF_W2 = OFF_B1 + NH
const OFF_B2 = OFF_W2 + NH * NS

/**
 * O campeão treinado em Python (estudo/evolucao.py): os 146 pesos. Uma rede
 * neural, no fim, é só essa lista de números; "treinar" é achar bons números.
 */
export const CAMPEAO = new Float64Array([
  1.2602, 0.0363, 0.9066, 1.028, -0.0468, 0.5498, 0.1074, -1.546, -0.663, -1.1144, 1.4438, 1.7141, 2.4055, -0.2664,
  1.2266, 1.279, -0.4503, -0.1258, 0.5238, 0.9762, -0.0608, -0.0877, -1.1544, -1.3375, 0.5678, 0.9721, 0.8138, 0.3033,
  -0.2275, -0.7606, 0.2581, -0.7851, 0.191, 1.1425, 0.6683, -0.4621, 0.1619, 0.442, -1.173, -0.4576, -0.1139, -0.194,
  0.5355, -0.3609, 0.3638, -0.3673, 0.5681, -0.6891, -0.7771, 0.8515, 0.5716, 0.783, -0.427, 0.6296, -0.288, 0.5027,
  0.3742, 0.6053, 0.1431, 0.7837, -0.1205, 1.0154, 0.2669, 0.9221, 0.4377, 0.1641, -0.1932, -0.5322, -0.9933, 0.0066,
  0.3278, -0.4428, -0.2644, 0.5416, 0.5527, -0.253, 0.31, 0.2101, 0.5498, -1.1971, -0.3605, -1.8032, -0.4652, 0.0726,
  -0.5407, 0.1636, -0.4588, 0.7296, -0.0295, 0.3832, -0.282, 0.2926, -0.0348, 0.276, 0.1965, 0.5119, 0.712, -0.752,
  -0.5933, -0.6364, 1.1159, -1.6661, -2.0797, 0.1498, 0.8188, 1.8973, -0.3951, -0.8496, -0.6792, 1.6598, -1.0764,
  1.6044, -1.0972, -0.2168, -0.1859, -0.2615, 0.3821, 1.6487, 0.9873, 1.7211, -1.6921, 0.1887, 1.4541, 2.0125, 1.8585,
  0.8569, 0.3161, -1.7354, -2.6542, -1.2935, -1.4755, -1.0297, 0.4427, 0.4546, 0.8104, 1.7627, 0.5571, 2.219, -2.014,
  -0.4509, 0.9409, 1.153, -1.5972, -0.1108, -1.685, -1.1661,
])

/** Os 20 climas da prova final: sementes fixas, nunca usadas no treino. */
export const PROVA = Array.from({ length: 20 }, (_, i) => 90000 + i)

// ---------- Sorteio com semente ----------

/**
 * mulberry32: gerador de números "aleatórios" a partir de uma semente. Mesma
 * semente → mesma sequência, sempre. É isso que deixa o experimento
 * repetível: o mesmo clima para o agente e para as regras, e o mesmo
 * resultado se rodar de novo.
 */
function mulberry32(semente: number): () => number {
  let a = semente
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = {
  /** Número entre 0 e 1. */
  u: () => number
  /** Número entre a e b. */
  unif: (a: number, b: number) => number
  /** Inteiro de 0 a n-1. */
  int: (n: number) => number
  /** Normal (curva de sino) com média 0 e desvio 1. */
  normal: () => number
}

export function criarRng(semente: number): Rng {
  const r = mulberry32(semente)
  let extra: number | null = null
  return {
    u: r,
    unif: (a, b) => a + (b - a) * r(),
    int: (n) => Math.floor(r() * n),
    // Box-Muller: transforma dois sorteios uniformes em dois da curva de sino.
    // Guarda o segundo para a próxima chamada, como no estudo.
    normal() {
      if (extra !== null) {
        const s = extra
        extra = null
        return s
      }
      let u = 0
      while (u === 0) u = r()
      const v = r()
      const m = Math.sqrt(-2 * Math.log(u))
      extra = m * Math.sin(2 * Math.PI * v)
      return m * Math.cos(2 * Math.PI * v)
    },
  }
}

// ---------- Clima ----------

export type Clima = {
  /** Temperatura de fora (°C) em cada passo. */
  tExt: Float64Array
  /** Sol de 0 (noite ou nublado) a 1 (sol pleno) em cada passo. */
  sol: Float64Array
  /** Hora do dia (0 a 24) em cada passo. */
  hora: Float64Array
}

/**
 * Sorteia 3 dias de clima: para cada dia, média (21 a 28 °C), amplitude (4 a
 * 8 °C) e nuvens (sol de 50% a 100%). Entre um dia e outro os valores são
 * interpolados (lerp: anda em linha reta de um valor ao outro), para o clima
 * não dar saltos à meia-noite.
 */
export function sortearClima(semente: number): Clima {
  const rng = criarRng(semente)
  const vals = (a: number, b: number) => Array.from({ length: DIAS + 1 }, () => rng.unif(a, b))
  const med = vals(21, 28)
  const amp = vals(4, 8)
  const nuv = vals(0.5, 1.0)
  const tExt = new Float64Array(PASSOS)
  const sol = new Float64Array(PASSOS)
  const hora = new Float64Array(PASSOS)
  for (let p = 0; p < PASSOS; p++) {
    const td = (p * MIN_PASSO) / 60 / 24
    const d = Math.floor(td)
    const f = td - d
    const h = (td * 24) % 24
    const lerp = (x: number[]) => x[d]! + (x[d + 1]! - x[d]!) * f
    hora[p] = h
    // O mais quente do dia às 15 h (seno deslocado de 9 h), o mais frio às 3 h.
    tExt[p] = lerp(med) + lerp(amp) * Math.sin((2 * Math.PI * (h - 9)) / 24)
    // Sol nasce às 6 h, pico ao meio-dia, se põe às 18 h.
    sol[p] = lerp(nuv) * Math.max(0, Math.sin((Math.PI * (h - 6)) / 12))
  }
  return { tExt, sol, hora }
}

// ---------- A rede ----------

/**
 * Monta as 6 entradas da rede. Normalizar é pôr cada número numa escala
 * parecida (perto de -1 a 1): a rede aprende melhor quando nenhuma entrada é
 * gigante perto das outras. A hora entra como seno e cosseno para 23 h ficar
 * "perto" de 0 h (um relógio é um círculo, não uma reta).
 */
export function observar(tInt: number, tInt1h: number, tExt: number, sol: number, hora: number, x: Float64Array): void {
  const ang = (2 * Math.PI * hora) / 24
  x[0] = (tInt - 22) / 8 // temperatura de dentro
  x[1] = (tInt - tInt1h) / 2 // tendência: quanto mudou na última hora
  x[2] = (tExt - 22) / 8 // temperatura de fora
  x[3] = sol
  x[4] = Math.sin(ang)
  x[5] = Math.cos(ang)
}

/**
 * Uma passada pela rede (forward pass) guardada em W a partir da posição `o`.
 * Cada neurônio oculto soma as entradas multiplicadas pelos seus pesos, mais
 * o viés, e passa por tanh. tanh (tangente hiperbólica) é a ativação: espreme
 * qualquer número para entre -1 e 1, e é essa curva que deixa a rede
 * aprender regras que não são retas. Nas saídas, a sigmoide espreme para
 * entre 0 e 1: a fração da potência de cada atuador.
 * Escreve a camada oculta em `h` e as saídas em `y` (sem criar arrays novos,
 * porque isso roda milhões de vezes no treino).
 */
export function decidir(W: Float64Array, o: number, x: Float64Array, h: Float64Array, y: Float64Array): void {
  for (let j = 0; j < NH; j++) {
    let s = W[o + OFF_B1 + j]!
    for (let i = 0; i < NE; i++) s += x[i]! * W[o + i * NH + j]!
    h[j] = Math.tanh(s)
  }
  for (let k = 0; k < NS; k++) {
    let s = W[o + OFF_B2 + k]!
    for (let j = 0; j < NH; j++) s += h[j]! * W[o + OFF_W2 + j * NS + k]!
    y[k] = 1 / (1 + Math.exp(-s))
  }
}

// ---------- Controle, física e nota de um passo ----------

/** Quem decide: ninguém, as regras fixas ou uma rede. */
export type TipoControle = 'nada' | 'regras' | 'rede'

/** Rascunho reaproveitado a cada passo (entradas, ocultos, saídas). */
export type Memoria = { x: Float64Array; h: Float64Array; y: Float64Array }
export const novaMemoria = (): Memoria => ({
  x: new Float64Array(NE),
  h: new Float64Array(NH),
  y: new Float64Array(NS),
})

/**
 * A decisão de um passo: [exaustor, nebulização], cada um de 0 a 1.
 * Regras fixas: exaustor liga acima de 24 °C e nebulização acima de 26 °C,
 * tudo ou nada (é o que um controlador simples de estufa faz).
 */
export function decidirAcao(
  tipo: TipoControle,
  W: Float64Array | null,
  o: number,
  t: number,
  t1h: number,
  tExt: number,
  sol: number,
  hora: number,
  mem: Memoria,
): [number, number] {
  if (tipo === 'regras') return [t > 24 ? 1 : 0, t > 26 ? 1 : 0]
  if (tipo === 'rede' && W) {
    observar(t, t1h, tExt, sol, hora, mem.x)
    decidir(W, o, mem.x, mem.h, mem.y)
    return [mem.y[0]!, mem.y[1]!]
  }
  return [0, 0]
}

/**
 * A física de brinquedo: o ar troca calor com fora (mais com o exaustor), o
 * sol esquenta e a nebulização esfria. Devolve a temperatura do próximo passo.
 */
export function avancarTemperatura(t: number, tExt: number, sol: number, exa: number, neb: number): number {
  const troca = (TROCA_PASSIVA + TROCA_EXAUSTOR * exa) * (tExt - t)
  return t + troca + AQUECE_SOL * sol - ESFRIA_NEBULIZ * neb
}

/** Graus fora da faixa (0 se está dentro). */
export const grausFora = (t: number): number => Math.max(0, FMIN - t) + Math.max(0, t - FMAX)

/** Custo de um passo: graus fora da faixa + gasto dos atuadores. */
export const custoDoPasso = (t: number, exa: number, neb: number): number =>
  C_FORA * grausFora(t) + C_EXA * exa + C_NEB * neb

// ---------- Simular com nota ----------

/**
 * Roda n estufas no mesmo clima, 3 dias, e devolve a nota de cada uma
 * (menos o custo somado; 0 seria perfeito). Com tipo 'rede', W guarda n redes
 * em sequência (146 números cada). Guarda a temperatura de 1 h atrás num
 * anel de 6 posições (6 passos de 10 min = 1 h): a posição p % 6 tem o valor
 * de 6 passos atrás, e é sobrescrita com o valor novo.
 */
export function simular(tipo: TipoControle, W: Float64Array | null, n: number, clima: Clima): Float64Array {
  const t = new Float64Array(n)
  const buf = new Float64Array(n * 6)
  const custo = new Float64Array(n)
  for (let e = 0; e < n; e++) {
    t[e] = clima.tExt[0]! + 1
    buf.fill(t[e]!, e * 6, e * 6 + 6)
  }
  const mem = novaMemoria()
  for (let p = 0; p < PASSOS; p++) {
    const te = clima.tExt[p]!
    const sol = clima.sol[p]!
    const hr = clima.hora[p]!
    const k = p % 6
    for (let e = 0; e < n; e++) {
      const t1h = buf[e * 6 + k]!
      const [exa, neb] = decidirAcao(tipo, W, e * NP, t[e]!, t1h, te, sol, hr, mem)
      const nova = avancarTemperatura(t[e]!, te, sol, exa, neb)
      t[e] = nova
      custo[e] = custo[e]! + custoDoPasso(nova, exa, neb)
      buf[e * 6 + k] = nova
    }
  }
  return custo.map((c) => -c)
}

/** Nota média de cada uma das n estufas em vários climas. */
export function mediaEmClimas(tipo: TipoControle, W: Float64Array | null, n: number, sementes: number[]): Float64Array {
  const soma = new Float64Array(n)
  for (const s of sementes) {
    const nt = simular(tipo, W, n, sortearClima(s))
    for (let e = 0; e < n; e++) soma[e] = soma[e]! + nt[e]!
  }
  return soma.map((v) => v / sementes.length)
}

// ---------- Evolução ----------

/** n redes com pesos sorteados (curva de sino × escala): a geração 0. */
export function pesosAleatorios(n: number, rng: Rng, escala = 0.5): Float64Array {
  const W = new Float64Array(n * NP)
  for (let i = 0; i < W.length; i++) W[i] = rng.normal() * escala
  return W
}

/**
 * Uma geração de evolução: devolve a população nova.
 * - Elitismo: as `elite` melhores redes passam inteiras, sem mudança, para a
 *   próxima geração. Assim a melhor solução achada nunca se perde.
 * - Torneio: para escolher um pai, sorteia 3 redes e fica com a melhor. Redes
 *   boas viram pais mais vezes, mas as fracas ainda têm chance (diversidade).
 * - Cruzamento: o filho pega cada peso de um dos dois pais, no cara ou coroa.
 * - Mutação: soma um ruído pequeno (normal × `mutacao`) em cada peso, para
 *   explorar soluções que nenhum pai tinha.
 */
export function novaGeracao(
  W: Float64Array,
  notas: Float64Array,
  n: number,
  elite: number,
  mutacao: number,
  rng: Rng,
): Float64Array {
  const ordem = Array.from(notas.keys()).sort((a, b) => notas[b]! - notas[a]!)
  const novo = new Float64Array(n * NP)
  for (let e = 0; e < elite; e++) {
    const o = ordem[e]! * NP
    novo.set(W.subarray(o, o + NP), e * NP)
  }
  const torneio = () => {
    let melhor = rng.int(n)
    for (let k = 1; k < 3; k++) {
      const c = rng.int(n)
      if (notas[c]! > notas[melhor]!) melhor = c
    }
    return melhor
  }
  for (let e = elite; e < n; e++) {
    const a = torneio() * NP
    const b = torneio() * NP
    const o = e * NP
    for (let i = 0; i < NP; i++) {
      novo[o + i] = (rng.u() < 0.5 ? W[a + i]! : W[b + i]!) + (mutacao > 0 ? rng.normal() * mutacao : 0)
    }
  }
  return novo
}
