import { AxisBottom, AxisLeft } from '@visx/axis'
import { curveMonotoneX } from '@visx/curve'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { COR, rotuloEixo } from './estilo'

type Ponto = { dia: number; massa: number }
type Props = {
  /** a curva esperada do ciclo inteiro (um ponto por dia) */
  curva: Ponto[]
  hoje: number
  /** massa estimada agora (o ponto destacado) */
  massaHoje: number
  altura?: number
}

/**
 * Curva de crescimento: cheia até hoje (o que já aconteceu), tracejada até a
 * colheita (o que se espera). O ponto é a massa estimada agora.
 */
export function CurvaCrescimento(props: Props) {
  return (
    // altura explícita: o ParentSize mede o pai, e um pai de altura automática mede zero
    <ParentSize debounceTime={50} style={{ width: '100%', height: props.altura ?? 160 }}>
      {({ width }) => (width > 0 ? <Desenho {...props} largura={width} /> : null)}
    </ParentSize>
  )
}

function Desenho({ curva, hoje, massaHoje, altura = 160, largura }: Props & { largura: number }) {
  const m = { topo: 8, direita: 12, baixo: 22, esquerda: 48 }
  const w = largura - m.esquerda - m.direita
  const h = altura - m.topo - m.baixo
  const ultimo = curva.at(-1)?.dia ?? 35
  const x = scaleLinear({ domain: [0, ultimo], range: [0, w] })
  const y = scaleLinear({
    domain: [0, Math.max(...curva.map((p) => p.massa), massaHoje) * 1.1],
    range: [h, 0],
    nice: true,
  })
  const feito = curva.filter((p) => p.dia <= hoje)
  const falta = curva.filter((p) => p.dia >= Math.floor(hoje))
  return (
    <svg
      width={largura}
      height={altura}
      role="img"
      aria-label={`Curva de crescimento: ${Math.round(massaHoje)} g no dia ${Math.floor(hoje)} de ${ultimo}`}
    >
      <Group left={m.esquerda} top={m.topo}>
        <LinePath
          data={falta}
          x={(p) => x(p.dia)}
          y={(p) => y(p.massa)}
          curve={curveMonotoneX}
          stroke={COR.linha}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.6}
        />
        <LinePath
          data={feito}
          x={(p) => x(p.dia)}
          y={(p) => y(p.massa)}
          curve={curveMonotoneX}
          stroke={COR.ok}
          strokeWidth={2}
        />
        <line x1={x(hoje)} x2={x(hoje)} y1={0} y2={h} stroke={COR.grade} />
        <circle cx={x(hoje)} cy={y(massaHoje)} r={4} fill={COR.ok} stroke="var(--cartao)" strokeWidth={2} />
        <AxisLeft
          scale={y}
          numTicks={4}
          hideAxisLine
          hideTicks
          tickFormat={(v) => `${v} g`}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'end', dx: -4, dy: 3 }}
        />
        <AxisBottom
          top={h}
          scale={x}
          numTicks={7}
          hideTicks
          stroke={COR.grade}
          tickFormat={(v) => `d${v}`}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'middle' }}
        />
      </Group>
    </svg>
  )
}
