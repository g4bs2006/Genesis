import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear } from '@visx/scale'
import { VStack } from '@astryxdesign/core/VStack'
import { COR, rotuloEixo } from './estilo'
import { LegendaGrafico } from './LegendaGrafico'

type Props = {
  /** uma linha por grupo (ex.: uma variável), um valor por série (ex.: agente, regras) */
  grupos: { rotulo: string; valores: number[] }[]
  series: { nome: string; cor: string }[]
  formatar: (v: number) => string
}

// 16 px por barra: o valor de cada barra (11 px) cabe sem encostar no da outra
const ALTURA_POR_BARRA = 16

/** Barras horizontais lado a lado, com o valor escrito na ponta. Legenda em cima. */
export function BarrasComparadas(props: Props) {
  const linha = props.series.length * ALTURA_POR_BARRA + 10
  const altura = props.grupos.length * linha + 4
  return (
    <VStack gap={2}>
      {/* legenda em HTML: quebra linha em vez de sair pela borda */}
      <LegendaGrafico itens={props.series} />
      <ParentSize debounceTime={50} style={{ width: '100%', height: altura }}>
        {({ width }) => (width > 0 ? <Desenho {...props} largura={width} altura={altura} linha={linha} /> : null)}
      </ParentSize>
    </VStack>
  )
}

function Desenho({
  grupos,
  series,
  formatar,
  largura,
  altura,
  linha,
}: Props & { largura: number; altura: number; linha: number }) {
  const m = { topo: 0, esquerda: 110, direita: 56 }
  const w = largura - m.esquerda - m.direita
  const max = Math.max(1, ...grupos.flatMap((g) => g.valores))
  const x = scaleLinear({ domain: [0, max], range: [0, w] })
  const y = scaleBand({ domain: grupos.map((g) => g.rotulo), range: [0, grupos.length * linha], padding: 0.15 })
  const alturaBarra = y.bandwidth() / series.length
  return (
    <svg width={largura} height={altura} role="img" aria-label={`Comparação: ${series.map((s) => s.nome).join(' e ')}`}>
      <Group left={m.esquerda} top={m.topo}>
        {grupos.map((g) => (
          <Group key={g.rotulo} top={y(g.rotulo)}>
            <text x={-10} y={y.bandwidth() / 2 + 4} textAnchor="end" {...rotuloEixo} fill="var(--texto-2)">
              {g.rotulo}
            </text>
            {g.valores.map((v, i) => (
              <Group key={i} top={i * alturaBarra}>
                <rect width={Math.max(1, x(v))} height={alturaBarra - 2} rx={2} fill={series[i]?.cor ?? COR.neutra} />
                <text x={x(v) + 6} y={alturaBarra / 2 + 3} {...rotuloEixo}>
                  {formatar(v)}
                </text>
              </Group>
            ))}
          </Group>
        ))}
      </Group>
    </svg>
  )
}
