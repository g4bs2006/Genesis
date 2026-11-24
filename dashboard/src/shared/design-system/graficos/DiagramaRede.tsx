import { ParentSize } from '@visx/responsive'
import { rotuloEixo } from './estilo'

export type RotuloEntrada = { rotulo: string; grupo?: string }

type Props = {
  /** ativação de cada camada, a primeira é a entrada; a última fica em 0..1 (sigmoide) */
  ativacoes: number[][]
  /** pesos de cada ligação entre camadas: matriz entradas × saídas achatada, linha por entrada */
  pesos: number[][]
  entradas?: RotuloEntrada[]
  saidas?: string[]
  rotulo: string
  altura?: number
}

/** fração das ligações desenhadas em cada camada: só as mais fortes, para a figura ficar calma */
const FRACAO_LIGACOES = 0.15
/** abaixo disso a figura encolhe inteira (viewBox) em vez de espremer os rótulos */
const LARGURA_MINIMA = 640

/**
 * Diagrama de uma rede em camadas (MLP), para qualquer arquitetura. Cada
 * bolinha é um neurônio, pintado pelo valor que está saindo dele (azul
 * negativo, laranja positivo, cinza perto de zero). Cada linha é um peso;
 * desenha só os sinais mais fortes (peso × ativação), mais grossos quanto
 * mais forte: é por eles que a decisão está passando agora.
 */
export function DiagramaRede(props: Props) {
  const altura = props.altura ?? 520
  return (
    <ParentSize debounceTime={50} style={{ width: '100%', height: altura }}>
      {({ width }) => (width > 0 ? <Desenho {...props} altura={altura} largura={width} /> : null)}
    </ParentSize>
  )
}

/** escala divergente feita só de tokens: o cinza no meio, azul e laranja nas pontas */
function corDivergente(v: number) {
  const p = Math.round(Math.min(1, Math.abs(v)) * 100)
  return `color-mix(in srgb, var(${v >= 0 ? '--serie-laranja' : '--serie-azul'}) ${p}%, var(--linha-2))`
}

function Desenho({
  ativacoes,
  pesos,
  entradas,
  saidas,
  rotulo,
  altura,
  largura,
}: Props & { altura: number; largura: number }) {
  const W = Math.max(largura, LARGURA_MINIMA)
  const H = altura
  const comEntradas = entradas && entradas.length === ativacoes[0]?.length
  const comSaidas = saidas && saidas.length === ativacoes.at(-1)?.length
  const m = { topo: 28, baixo: 10, esquerda: comEntradas ? 190 : 20, direita: comSaidas ? 170 : 20 }
  const L = ativacoes.length
  const xDe = (l: number) => m.esquerda + (l * (W - m.esquerda - m.direita)) / Math.max(1, L - 1)

  // y de cada neurônio: espalhados por igual, com um respiro entre grupos de entrada
  const ys = ativacoes.map((camada, l) => {
    const grupos = l === 0 && comEntradas ? entradas.map((e) => e.grupo) : []
    const vagas = camada.map(
      (_, i) => i + grupos.slice(0, i + 1).filter((g, k) => k > 0 && g !== grupos[k - 1]).length * 0.8,
    )
    const total = (vagas.at(-1) ?? 0) + 1
    const passo = Math.min(22, (H - m.topo - m.baixo) / total)
    const inicio = m.topo + (H - m.topo - m.baixo - passo * total) / 2 + passo / 2
    return { y: vagas.map((v) => inicio + v * passo), passo }
  })

  // ligações: sinal = peso × ativação de quem manda; ficam só as mais fortes de cada camada
  const ligacoes = pesos.flatMap((w, l) => {
    const de = ativacoes[l] ?? []
    const para = ativacoes[l + 1]?.length ?? 0
    const todas = w.map((peso, k) => ({
      l,
      i: Math.floor(k / para),
      j: k % para,
      s: peso * (de[Math.floor(k / para)] ?? 0),
    }))
    const fortes = todas
      .sort((a, b) => Math.abs(b.s) - Math.abs(a.s))
      .slice(0, Math.ceil(todas.length * FRACAO_LIGACOES))
    const maior = Math.abs(fortes[0]?.s ?? 0) || 1
    return fortes.map((f) => ({ ...f, forca: Math.abs(f.s) / maior }))
  })

  const nomeCamada = (l: number) => (l === 0 ? 'entradas' : l === L - 1 ? 'saídas' : `camada ${l}`)

  return (
    <svg width={largura} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rotulo}>
      <title>{rotulo}</title>
      {ativacoes.map((_, l) => (
        <text key={l} x={xDe(l)} y={12} textAnchor="middle" {...rotuloEixo}>
          {nomeCamada(l)}
        </text>
      ))}
      {ligacoes.map(({ l, i, j, s, forca }) => (
        <line
          key={`${l}-${i}-${j}`}
          x1={xDe(l)}
          y1={ys[l]!.y[i]}
          x2={xDe(l + 1)}
          y2={ys[l + 1]!.y[j]}
          stroke={s >= 0 ? 'var(--serie-laranja)' : 'var(--serie-azul)'}
          strokeOpacity={0.12 + 0.6 * forca}
          strokeWidth={0.5 + 2.5 * forca}
        />
      ))}
      {ativacoes.map((camada, l) => {
        const { y, passo } = ys[l]!
        const r = Math.max(2.5, Math.min(7, passo * 0.36))
        const saida = l === L - 1
        return camada.map((v, i) => (
          <g key={`${l}-${i}`}>
            {/* fundo opaco: a cor do neurônio é translúcida e as linhas não devem aparecer através dela */}
            <circle cx={xDe(l)} cy={y[i]} r={r} fill="var(--cartao)" />
            <circle
              cx={xDe(l)}
              cy={y[i]}
              r={r}
              // a saída é sigmoide (0..1): vai do cinza (desligado) ao laranja (ligado)
              fill={saida ? corDivergente(Math.max(0, v)) : corDivergente(v)}
              stroke="var(--texto-3)"
              strokeOpacity={0.35}
            />
            {l === 0 && comEntradas && (
              <>
                {entradas[i]?.grupo && entradas[i]?.grupo !== entradas[i - 1]?.grupo && (
                  <text x={4} y={y[i]! + 3.5} {...rotuloEixo}>
                    {entradas[i]!.grupo}
                  </text>
                )}
                <text x={xDe(0) - r - 6} y={y[i]! + 3.5} textAnchor="end" {...rotuloEixo} fill="var(--texto-2)">
                  {entradas[i]!.rotulo}
                </text>
              </>
            )}
            {saida && comSaidas && (
              <text x={xDe(l) + r + 6} y={y[i]! + 3.5} {...rotuloEixo} fill="var(--texto-2)">
                {saidas[i]}
                <tspan fill="var(--texto-3)"> {Math.round(v * 100)}%</tspan>
              </text>
            )}
          </g>
        ))
      })}
    </svg>
  )
}
