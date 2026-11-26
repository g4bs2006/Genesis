import { useState, type PointerEvent } from 'react'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { BalaoGrafico } from './BalaoGrafico'
import { COR, rotuloEixo } from './estilo'

export type PontoGeracao = { geracao: number; valor: number }

type Props = {
  /** um ponto por campeão salvo (só os que existem: nada de ligar o que não foi medido) */
  pontos: PontoGeracao[]
  /** a régua: as regras fixas no mesmo clima, uma linha horizontal tracejada */
  referencia?: { nome: string; valor: number }
  formatarValor: (v: number) => string
  rotulo: string
  altura?: number
  cor?: string
}

/**
 * Uma medida dos campeões ao longo das gerações (tempo fora da faixa, energia,
 * massa ou nota), com as regras fixas como referência. Ponteiro em cima: balão
 * com o valor exato do campeão mais perto.
 */
export function LinhaPorGeracao(props: Props) {
  const altura = props.altura ?? 200
  return (
    <ParentSize debounceTime={50} style={{ width: '100%', height: altura }}>
      {({ width }) => (width > 0 ? <Desenho {...props} altura={altura} largura={width} /> : null)}
    </ParentSize>
  )
}

function Desenho({
  pontos,
  referencia,
  formatarValor,
  rotulo,
  altura,
  largura,
  cor = 'var(--serie-verde)',
}: Props & { altura: number; largura: number }) {
  const [sobre, setSobre] = useState<PontoGeracao | null>(null)
  const m = { topo: 12, direita: 16, baixo: 24, esquerda: 72 }
  const w = Math.max(10, largura - m.esquerda - m.direita)
  const h = altura - m.topo - m.baixo
  if (pontos.length === 0) return <svg width={largura} height={altura} role="img" aria-label={rotulo} />

  const valores = [...pontos.map((p) => p.valor), ...(referencia ? [referencia.valor] : [])]
  const [min, max] = [Math.min(...valores), Math.max(...valores)]
  const folga = (max - min) * 0.1 || Math.abs(max) * 0.1 || 1
  const ultima = Math.max(...pontos.map((p) => p.geracao))
  const x = scaleLinear({ domain: [0, ultima], range: [0, w], nice: true })
  const y = scaleLinear({ domain: [min - folga, max + folga], range: [h, 0], nice: true })
  const mover = (e: PointerEvent<SVGRectElement>) => {
    const g = x.invert(Math.min(w, Math.max(0, e.clientX - e.currentTarget.getBoundingClientRect().left)))
    setSobre(pontos.reduce((a, b) => (Math.abs(b.geracao - g) < Math.abs(a.geracao - g) ? b : a), pontos[0]!))
  }

  return (
    <svg width={largura} height={altura} role="img" aria-label={rotulo}>
      <Group left={m.esquerda} top={m.topo}>
        {y.ticks(4).map((v) => (
          <line key={v} x1={0} x2={w} y1={y(v)} y2={y(v)} stroke={COR.grade} />
        ))}
        {referencia && (
          <>
            <line
              x1={0}
              x2={w}
              y1={y(referencia.valor)}
              y2={y(referencia.valor)}
              stroke="var(--serie-cinza)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={w - 4}
              y={y(referencia.valor) - 6}
              textAnchor="end"
              {...rotuloEixo}
              stroke="var(--cartao)"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {referencia.nome}
            </text>
          </>
        )}
        <LinePath data={pontos} x={(p) => x(p.geracao)} y={(p) => y(p.valor)} stroke={cor} strokeWidth={2} />
        {pontos.map((p) => (
          <circle key={p.geracao} cx={x(p.geracao)} cy={y(p.valor)} r={3.5} fill={cor} />
        ))}
        <AxisLeft
          scale={y}
          numTicks={4}
          hideAxisLine
          hideTicks
          tickFormat={(v) => formatarValor(Number(v))}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'end', dx: -6, dy: 3 }}
        />
        <AxisBottom
          top={h}
          scale={x}
          numTicks={Math.max(3, Math.floor(w / 80))}
          hideTicks
          stroke={COR.grade}
          tickFormat={(v) => `g${Number(v)}`}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'middle' }}
        />
        {sobre && (
          <>
            <circle cx={x(sobre.geracao)} cy={y(sobre.valor)} r={5} fill="none" stroke={cor} strokeWidth={2} />
            <BalaoGrafico
              x={x(sobre.geracao)}
              y={y(sobre.valor)}
              largura={w}
              altura={h}
              titulo={`campeão da geração ${sobre.geracao}`}
              linhas={[
                { texto: formatarValor(sobre.valor), cor },
                ...(referencia
                  ? [
                      {
                        texto: `${referencia.nome}: ${formatarValor(referencia.valor)}`,
                        cor: 'var(--serie-cinza)',
                        tracejada: true,
                      },
                    ]
                  : []),
              ]}
            />
          </>
        )}
        <rect
          width={w}
          height={h}
          fill="transparent"
          onPointerMove={mover}
          onPointerLeave={() => setSobre(null)}
          style={{ touchAction: 'pan-y' }}
        />
      </Group>
    </svg>
  )
}
