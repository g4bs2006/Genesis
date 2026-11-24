import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear } from '@visx/scale'
import { COR, rotuloEixo } from './estilo'

type Props = {
  /** uma linha por grupo (ex.: uma variável), um valor por série (ex.: agente, regras) */
  grupos: { rotulo: string; valores: number[] }[]
  series: { nome: string; cor: string }[]
  formatar: (v: number) => string
}

const ALTURA_LINHA = 30

/** Barras horizontais lado a lado, com o valor escrito na ponta. Legenda em cima. */
export function BarrasComparadas(props: Props) {
  const altura = props.grupos.length * ALTURA_LINHA + 28
  return (
    <ParentSize debounceTime={50} style={{ width: '100%', height: altura }}>
      {({ width }) => (width > 0 ? <Desenho {...props} largura={width} altura={altura} /> : null)}
    </ParentSize>
  )
}

function Desenho({ grupos, series, formatar, largura, altura }: Props & { largura: number; altura: number }) {
  const m = { topo: 24, esquerda: 110, direita: 56 }
  const w = largura - m.esquerda - m.direita
  const max = Math.max(1, ...grupos.flatMap((g) => g.valores))
  const x = scaleLinear({ domain: [0, max], range: [0, w] })
  const y = scaleBand({ domain: grupos.map((g) => g.rotulo), range: [0, grupos.length * ALTURA_LINHA], padding: 0.25 })
  const alturaBarra = y.bandwidth() / series.length
  return (
    <svg width={largura} height={altura} role="img" aria-label={`Comparação: ${series.map((s) => s.nome).join(' e ')}`}>
      <Group left={m.esquerda}>
        {series.map((s, i) => (
          <Group key={s.nome} left={i * 120}>
            <rect y={4} width={10} height={10} rx={2} fill={s.cor} />
            <text x={16} y={13} {...rotuloEixo} fill="var(--texto-2)">
              {s.nome}
            </text>
          </Group>
        ))}
      </Group>
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
