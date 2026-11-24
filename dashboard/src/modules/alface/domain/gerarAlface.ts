/**
 * gerarAlface: a descrição de uma alface crespa (caminhos SVG e cores) a partir
 * do estado da planta. Função pura: mesma entrada, mesma saída, sem tela.
 * O componente AlfaceSvg só desenha o que sai daqui.
 *
 * Como a planta é montada:
 * 1. Roseta: as folhas nascem do centro, uma a uma, cada nova girada pelo
 *    ângulo áureo (~137,5°) em relação à anterior. É assim que a alface (e o
 *    girassol, a pinha...) espalha as folhas sem uma cobrir a outra.
 * 2. Cada folha é uma curva em 3D (sai do centro, sobe, e a ponta pende) que
 *    depois é "fotografada" de lado em 3/4, de um pouco acima.
 * 3. Folhas de fora são as mais velhas: maiores, mais abertas e mais escuras.
 *    As de dentro são pequenas, claras e fechadas: o miolo.
 * 4. A borda é franzida (crespa) com uma soma de ondas, mais forte na ponta.
 * 5. As folhas são desenhadas de trás para a frente (ordenadas pela profundidade),
 *    cada uma com uma sombra leve sobre as de trás.
 */

export type ParametrosAlface = {
  /** massa fresca por pé, em gramas: define quantas folhas e o tamanho */
  massa: number
  /** 0..1: 1 = folhas firmes e eretas; 0 = murchas e caídas (calor, ar seco, falta de água) */
  turgor: number
  /** 0..1: amarelamento das folhas velhas para as novas (falta de nutriente, EC baixa) */
  clorose: number
  /** 0..1: bordas queimadas (pH fora, salinidade, solução parada) */
  necrose: number
}

export type Ponto = { x: number; y: number }

export type DesenhoFolha = {
  /** identidade estável da folha (0 = a mais velha, de fora) */
  indice: number
  contorno: string
  nervuraCentral: string
  secundarias: string[]
  /** linhas de franzido perto da borda (relevo da folha crespa) */
  dobras: string[]
  gradiente: { de: Ponto; ate: Ponto; base: string; meio: string; ponta: string }
  nervuraCor: string
  dobraCor: string
  /** 0..1 nesta folha (as velhas queimam primeiro): borda marrom no contorno */
  necrose: number
  necroseCor: string
  /** a folha mais nova cresce aos poucos (0..1), para não "pipocar" */
  opacidade: number
}

export type DesenhoAlface = {
  viewBox: string
  folhas: DesenhoFolha[]
  cano: { topo: string; frente: string; lado: string }
  furo: { cx: number; cy: number; rx: number; ry: number }
  /** recorte na frente do cano mostrando a lâmina de água e as raízes */
  janela: { x: number; y: number; largura: number; altura: number; agua: number } | null
  raizes: string[]
}

// ---------------------------------------------------------------------------
// Sorteio determinístico: a mesma semente dá sempre a mesma alface

/** mulberry32: gerador de números "aleatórios" previsível a partir de uma semente */
function sorteador(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Um sorteador próprio por folha: acrescentar folhas não muda as que já existem */
const sorteioDaFolha = (semente: number, indice: number) => sorteador(semente * 7919 + indice * 104729 + 13)

// ---------------------------------------------------------------------------
// Cores (HSL: matiz, saturação, luz). Misturar em HSL é simples e previsível.

type Hsl = [number, number, number]
const mistura = (a: Hsl, b: Hsl, t: number): Hsl => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
const css = ([h, s, l]: Hsl) => `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`

// Paleta da alface crespa verde. Cor de planta é conteúdo, não interface:
// por isso mora aqui e não nos tokens do tema (decisão 0002).
const BASE_MIOLO: Hsl = [68, 72, 80] // verde-claro amarelado
const BASE_FORA: Hsl = [84, 50, 52]
const PONTA_MIOLO: Hsl = [86, 58, 54]
const PONTA_FORA: Hsl = [102, 50, 32] // verde escuro das folhas velhas
const AMARELO: Hsl = [50, 78, 60] // clorose
const QUEIMADO: Hsl = [26, 55, 28] // necrose
const NERVURA: Hsl = [74, 55, 80]

// ---------------------------------------------------------------------------
// Geometria

const r2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const GRAU = Math.PI / 180
const ANGULO_AUREO = 137.508 * GRAU

/** Curva suave passando por todos os pontos (Catmull-Rom convertida em Bézier) */
function curvaSuave(pts: Ponto[], fechada: boolean): string {
  if (pts.length < 2) return ''
  const p = (i: number) => pts[fechada ? (i + pts.length) % pts.length : clamp(i, 0, pts.length - 1)]!
  let d = `M${r2(pts[0]!.x)} ${r2(pts[0]!.y)}`
  const n = fechada ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1)
    const p1 = p(i)
    const p2 = p(i + 1)
    const p3 = p(i + 2)
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += `C${r2(c1.x)} ${r2(c1.y)} ${r2(c2.x)} ${r2(c2.y)} ${r2(p2.x)} ${r2(p2.y)}`
  }
  return fechada ? `${d}Z` : d
}

/** Polígono preenchido de largura variável ao longo de uma linha (a nervura central) */
function faixa(eixo: Ponto[], normais: Ponto[], largura: (s: number) => number): string {
  const n = eixo.length - 1
  const esquerda = eixo.map((p, i) => {
    const w = largura(i / n)
    return { x: p.x + normais[i]!.x * w, y: p.y + normais[i]!.y * w }
  })
  const direita = eixo.map((p, i) => {
    const w = largura(i / n)
    return { x: p.x - normais[i]!.x * w, y: p.y - normais[i]!.y * w }
  })
  return curvaSuave([...esquerda, ...direita.reverse()], true)
}

// Câmera: vista de lado em 3/4, um pouco de cima. INCLINACAO é quanto a
// profundidade (frente/trás) aparece como altura na tela.
const INCLINACAO = 0.3
const CENTRO = { x: 105, y: 152 }

type Folha3D = {
  indice: number
  azimute: number
  idade: number // 1 = mais velha (fora), 0 = mais nova (miolo)
  comprimento: number
  larguraMax: number
  elevacao: number
  curvatura: number
  raioBase: number
  fases: number[]
  crescimento: number
}

/** Ponto do eixo da folha em s (0 = base, 1 = ponta): posição na tela e profundidade */
function eixoDaFolha(f: Folha3D, amostras: number) {
  const pts: Ponto[] = []
  const prof: number[] = []
  let horizontal = f.raioBase
  let vertical = 0
  const ds = 1 / amostras
  const sx = Math.sin(f.azimute)
  const sz = Math.cos(f.azimute)
  for (let i = 0; i <= amostras; i++) {
    const s = i * ds
    const x3 = horizontal * sx
    const z3 = horizontal * sz // positivo = vem para a frente (perto de quem olha)
    pts.push({ x: CENTRO.x + x3, y: CENTRO.y - vertical + z3 * INCLINACAO })
    prof.push(z3)
    // a folha sai na elevação inicial e vai pendendo (curvatura) até a ponta
    const angulo = f.elevacao - f.curvatura * s
    horizontal += Math.cos(angulo) * f.comprimento * ds
    vertical += Math.sin(angulo) * f.comprimento * ds
  }
  return { pts, prof }
}

function normaisDe(pts: Ponto[]): Ponto[] {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)]!
    const b = pts[Math.min(pts.length - 1, i + 1)]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    return { x: -dy / len, y: dx / len }
  })
}

/** Perfil da largura: estreita na base, mais larga perto de 2/3 e ponta
 *  arredondada (a raiz quadrada faz a borda chegar na ponta "de lado") */
const perfilBruto = (s: number) => Math.pow(s, 0.5) * Math.sqrt(Math.max(0, 1 - Math.pow(s, 3)))
const MAX_PERFIL = Math.max(...Array.from({ length: 101 }, (_, i) => perfilBruto(i / 100)))
const perfil = (s: number) => perfilBruto(s) / MAX_PERFIL

function desenharFolha(f: Folha3D, p: ParametrosAlface): { desenho: DesenhoFolha; profundidade: number } {
  const AMOSTRAS = 48
  const { pts: eixo, prof } = eixoDaFolha(f, AMOSTRAS)
  const normais = normaisDe(eixo)
  // A largura da folha é horizontal em 3D, de lado ao eixo: (cos φ, 0, -sen φ).
  // Na tela ela vira este vetor; folha virada de lado aparece mais estreita
  // (escorço). O 0,5 no lugar da inclinação da câmera simula a folha
  // levemente voltada para cima, para não sumir de perfil.
  const lateral = { x: Math.cos(f.azimute), y: -0.5 * Math.sin(f.azimute) }
  const escorco = Math.hypot(lateral.x, lateral.y)
  const meiaLargura = (s: number) => f.larguraMax * perfil(s)
  // Folha vista quase de perfil vira uma "agulha": soma um pouco da normal da
  // tela (no mesmo sentido do vetor lateral) para garantir largura mínima.
  const largo = (i: number): Ponto => {
    const n = normais[i]!
    const sentido = Math.sign(n.x * lateral.x + n.y * lateral.y) || 1
    return { x: lateral.x + n.x * 0.32 * sentido, y: lateral.y + n.y * 0.32 * sentido }
  }

  // Franzido: ondas de três frequências (crespa = muitas ondas pequenas), mais fortes na ponta
  const [f1, f2, f3, f4, f5, f6] = f.fases as [number, number, number, number, number, number]
  const franzido = (s: number, lado: 0 | 1) => {
    const fase = lado ? [f4, f5, f6] : [f1, f2, f3]
    const onda =
      0.55 * Math.sin(2 * Math.PI * 8 * s + fase[0]!) +
      0.3 * Math.sin(2 * Math.PI * 15 * s + fase[1]!) +
      0.15 * Math.sin(2 * Math.PI * 27 * s + fase[2]!)
    return f.larguraMax * 0.26 * Math.pow(s, 1.3) * onda
  }

  const margem = (lado: 0 | 1) =>
    eixo.map((pt, i) => {
      const s = i / AMOSTRAS
      const w = Math.max(0, meiaLargura(s) + (s > 0.05 && s < 0.99 ? franzido(s, lado) : 0))
      const sinal = lado ? -1 : 1
      const l = largo(i)
      return { x: pt.x + l.x * w * sinal, y: pt.y + l.y * w * sinal }
    })
  const esquerda = margem(0)
  const direita = margem(1).reverse()
  const contorno = curvaSuave([...esquerda.slice(0, -1), ...direita], true)

  // Nervura central: larga e clara na base, afinando até sumir perto da ponta
  const ateNervura = Math.round(AMOSTRAS * 0.9)
  const nervuraCentral = faixa(eixo.slice(0, ateNervura + 1), normais.slice(0, ateNervura + 1), (s) =>
    lerp(f.larguraMax * 0.075 * escorco, 0.12, Math.pow(s, 0.6)),
  )

  // Secundárias: saem da central e correm para a borda, inclinadas para a ponta
  const secundarias: string[] = []
  for (const s0 of [0.22, 0.36, 0.5, 0.63, 0.75, 0.86]) {
    for (const lado of [1, -1] as const) {
      const i0 = Math.round(s0 * AMOSTRAS)
      const i1 = Math.min(AMOSTRAS, i0 + 6)
      const base = eixo[i0]!
      const alvo = eixo[i1]!
      const w = meiaLargura(s0) * 0.85
      const fim = { x: alvo.x + lateral.x * w * lado, y: alvo.y + lateral.y * w * lado }
      const meio = {
        x: lerp(base.x, fim.x, 0.5) + lateral.x * w * 0.25 * lado,
        y: lerp(base.y, fim.y, 0.5) + lateral.y * w * 0.25 * lado,
      }
      secundarias.push(curvaSuave([base, meio, fim], false))
    }
  }

  // Dobras do franzido: linhas curtas, paralelas à borda, perto da ponta
  const dobras: string[] = []
  for (const lado of [1, -1] as const) {
    const linha: Ponto[] = []
    for (let i = Math.round(AMOSTRAS * 0.45); i <= Math.round(AMOSTRAS * 0.92); i += 2) {
      const s = i / AMOSTRAS
      const w = meiaLargura(s) * 0.72 + franzido(s, lado === 1 ? 0 : 1) * 0.6
      linha.push({ x: eixo[i]!.x + lateral.x * w * lado, y: eixo[i]!.y + lateral.y * w * lado })
    }
    dobras.push(curvaSuave(linha, false))
  }

  // ---- cores
  const idade = f.idade
  const clorose = clamp(p.clorose * 2.2 - (1 - idade) * 1.0) // velhas (de fora) amarelam primeiro
  const necrose = clamp(p.necrose * (0.6 + 0.8 * idade))
  const ajustar = (c: Hsl, pesoAmarelo: number): Hsl => {
    const amarelada = mistura(c, AMARELO, clorose * pesoAmarelo)
    // sem turgor a folha fica opaca: menos saturada e um pouco mais escura
    return [amarelada[0], amarelada[1] * (0.6 + 0.4 * p.turgor), amarelada[2] * (0.86 + 0.14 * p.turgor)]
  }
  const base = ajustar(mistura(BASE_MIOLO, BASE_FORA, idade), 0.8)
  // necrose: a ponta (onde a borda se concentra no desenho) escurece para o marrom
  const ponta = mistura(ajustar(mistura(PONTA_MIOLO, PONTA_FORA, idade), 1), QUEIMADO, necrose * 0.35)
  const meio = mistura(base, ponta, 0.55 - necrose * 0.2)
  const ultimo = eixo[AMOSTRAS]!

  const profundidade = prof[Math.round(AMOSTRAS * 0.5)]!
  return {
    profundidade,
    desenho: {
      indice: f.indice,
      contorno,
      nervuraCentral,
      secundarias,
      dobras,
      gradiente: { de: eixo[0]!, ate: ultimo, base: css(base), meio: css(meio), ponta: css(ponta) },
      nervuraCor: css(mistura(mistura(base, NERVURA, 0.65), AMARELO, clorose * 0.4)),
      dobraCor: css([ponta[0], ponta[1], ponta[2] * 0.72]),
      necrose: r2(necrose),
      necroseCor: css(QUEIMADO),
      opacidade: r2(f.crescimento),
    },
  }
}

// ---------------------------------------------------------------------------
// O perfil NFT: cano retangular branco visto em 3/4, com o furo e o copinho

function desenharCano(massa: number): Pick<DesenhoAlface, 'cano' | 'furo' | 'janela' | 'raizes'> {
  const cano = {
    topo: 'M12 160L188 160L198 150L22 150Z',
    frente: 'M12 160L188 160L188 186L12 186Z',
    lado: 'M188 160L198 150L198 176L188 186Z',
  }
  const furo = { cx: CENTRO.x, cy: 155, rx: 14, ry: 4.2 }
  // As raízes só aparecem quando a planta já tem raiz para mostrar
  if (massa < 35) return { cano, furo, janela: null, raizes: [] }
  const janela = { x: 66, y: 166, largura: 78, altura: 16, agua: 5 }
  const quantas = Math.round(clamp((massa - 35) / 180) * 9) + 3
  const rnd = sorteador(4242)
  const raizes: string[] = []
  for (let i = 0; i < quantas; i++) {
    const x0 = CENTRO.x + (rnd() - 0.5) * 10
    const comprimento = 6 + clamp(massa / 220) * 12 + rnd() * 4
    const deriva = (rnd() - 0.5) * 26 * clamp(massa / 200)
    const pts: Ponto[] = [{ x: x0, y: janela.y }]
    for (let k = 1; k <= 4; k++) {
      const t = k / 4
      pts.push({ x: x0 + deriva * t + Math.sin(t * 6 + i) * 1.6, y: janela.y + comprimento * t })
    }
    raizes.push(curvaSuave(pts, false))
  }
  return { cano, furo, janela, raizes }
}

// ---------------------------------------------------------------------------

export function gerarAlface(parametros: ParametrosAlface, semente: number): DesenhoAlface {
  const p: ParametrosAlface = {
    massa: Math.max(0, parametros.massa),
    turgor: clamp(parametros.turgor),
    clorose: clamp(parametros.clorose),
    necrose: clamp(parametros.necrose),
  }
  // Número de folhas cresce com a massa (contínuo: a mais nova entra aos poucos)
  const nContinuo = 5 + 19 * Math.pow(clamp(p.massa / 250, 0, 1.3), 0.6)
  const n = Math.ceil(nContinuo)
  // Tamanho geral cresce com a raiz cúbica da massa (volume -> comprimento)
  const escala = 16 + 62 * Math.cbrt(clamp(p.massa / 260, 0, 1.3))

  const folhas3d: Folha3D[] = []
  for (let i = 0; i < n; i++) {
    const rnd = sorteioDaFolha(semente, i)
    const idade = clamp(1 - i / Math.max(1, nContinuo - 1))
    const crescimento = i === n - 1 ? clamp(nContinuo - (n - 1)) : 1
    const tamanho = (0.55 + 0.45 * Math.pow(idade, 0.75)) * (0.25 + 0.75 * crescimento)
    // eretas no miolo, abertas por fora; sem turgor, tudo cai
    const elevacao = lerp(86, 32, Math.pow(idade, 0.8)) * GRAU * (0.45 + 0.55 * p.turgor) + (rnd() - 0.5) * 8 * GRAU
    // a ponta pende mais nas folhas velhas e quando falta turgor
    const curvatura = (0.2 + 0.8 * idade) * (1.25 - p.turgor) + rnd() * 0.12
    folhas3d.push({
      indice: i,
      azimute: i * ANGULO_AUREO + (rnd() - 0.5) * 14 * GRAU + semente * 0.37,
      idade,
      comprimento: escala * tamanho * (0.92 + rnd() * 0.16),
      larguraMax: escala * tamanho * lerp(0.32, 0.5, idade) * (0.9 + rnd() * 0.2),
      elevacao,
      curvatura,
      raioBase: 1.5 + 3 * idade * Math.cbrt(clamp(p.massa / 260)),
      fases: Array.from({ length: 6 }, () => rnd() * Math.PI * 2),
      crescimento,
    })
  }

  // De trás para a frente: as folhas da frente cobrem as de trás
  const folhas = folhas3d
    .map((f) => desenharFolha(f, p))
    .sort((a, b) => a.profundidade - b.profundidade)
    .map((f) => f.desenho)

  // o céu acima do pé maior fica de fora (corte em y=44)
  return { viewBox: '0 44 210 152', folhas, ...desenharCano(p.massa) }
}
