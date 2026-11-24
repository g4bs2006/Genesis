import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
import { AreaClosed, LinePath } from '@visx/shape'
import { curveMonotoneX } from '@visx/curve'
import type { Estado } from '../atoms/SeloEstado'
import { COR } from './estilo'

type Props = {
  valores: number[]
  /** cinza quando ok; colorida só quando a variável está fora do normal */
  estado: Estado
  /** a faixa boa, desenhada como uma tira clara atrás */
  faixa?: [number, number]
  altura?: number
  rotulo: string
}

/** Minigráfico de 24 h, sem eixos. Largura fluida (ocupa o card). */
export function Sparkline(props: Props) {
  return (
    <ParentSize
      debounceTime={50}
      initialSize={{ width: 300, height: 0 }}
      style={{ width: '100%', height: props.altura ?? 36 }}
    >
      {({ width }) => (width > 0 ? <Desenho {...props} largura={width} /> : null)}
    </ParentSize>
  )
}

function Desenho({ valores, estado, faixa, altura = 36, rotulo, largura }: Props & { largura: number }) {
  if (valores.length < 2) return <svg width={largura} height={altura} aria-hidden />
  const min = Math.min(...valores, faixa?.[0] ?? Infinity)
  const max = Math.max(...valores, faixa?.[1] ?? -Infinity)
  const folga = (max - min) * 0.1 || 1
  const x = scaleLinear({ domain: [0, valores.length - 1], range: [1, largura - 1] })
  const y = scaleLinear({ domain: [min - folga, max + folga], range: [altura - 2, 2] })
  const cor = estado === 'ok' ? COR.neutra : estado === 'atencao' ? COR.atencao : COR.risco
  const pontos = valores.map((v, i) => ({ i, v }))
  return (
    <svg width={largura} height={altura} role="img" aria-label={rotulo}>
      {faixa && (
        <rect
          x={0}
          width={largura}
          y={y(faixa[1])}
          height={y(faixa[0]) - y(faixa[1])}
          fill={COR.faixa}
          opacity={0.08}
        />
      )}
      <AreaClosed
        data={pontos}
        x={(p) => x(p.i)}
        y={(p) => y(p.v)}
        yScale={y}
        curve={curveMonotoneX}
        fill={cor}
        opacity={0.08}
      />
      <LinePath
        data={pontos}
        x={(p) => x(p.i)}
        y={(p) => y(p.v)}
        curve={curveMonotoneX}
        stroke={cor}
        strokeWidth={1.5}
      />
      <circle cx={x(valores.length - 1)} cy={y(valores.at(-1)!)} r={2.5} fill={cor} />
    </svg>
  )
}
