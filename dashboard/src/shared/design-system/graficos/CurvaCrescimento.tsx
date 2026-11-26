import { useState, type PointerEvent } from 'react'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { curveMonotoneX } from '@visx/curve'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { BalaoGrafico } from './BalaoGrafico'
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
 * colheita (o que se espera). O ponto é a massa estimada agora. Ponteiro em
 * cima: balão com a massa daquele dia.
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
  const [sobre, setSobre] = useState<{ dia: number; massa: number } | null>(null)
  const m = { topo: 16, direita: 12, baixo: 22, esquerda: 48 }
  const w = largura - m.esquerda - m.direita
  const h = altura - m.topo - m.baixo
  const ultimo = curva.at(-1)?.dia ?? 35
  const x = scaleLinear({ domain: [0, ultimo], range: [0, w] })
  const y = scaleLinear({
    domain: [0, Math.max(...curva.map((p) => p.massa), massaHoje) * 1.1],
    range: [h, 0],
    nice: true,
  })
  // o ponto de hoje entra nas duas linhas: a cheia termina nele e a tracejada começa nele
  const agora = { dia: hoje, massa: massaHoje }
  const feito = [...curva.filter((p) => p.dia < hoje), agora]
  const falta = [agora, ...curva.filter((p) => p.dia > hoje)]
  const mover = (e: PointerEvent<SVGRectElement>) => {
    const caixa = e.currentTarget.getBoundingClientRect()
    const dia = x.invert(Math.min(w, Math.max(0, e.clientX - caixa.left)))
    setSobre(curva.reduce((a, b) => (Math.abs(b.dia - dia) < Math.abs(a.dia - dia) ? b : a), curva[0]!))
  }
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
        <text x={x(hoje)} y={-5} textAnchor="middle" {...rotuloEixo}>
          hoje
        </text>
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
          // só dias inteiros no eixo (nada de "d0.5")
          tickValues={x.ticks(7).filter((v) => Number.isInteger(v))}
          hideTicks
          stroke={COR.grade}
          tickFormat={(v) => `d${v}`}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'middle' }}
        />
        {sobre && (
          <>
            <circle
              cx={x(sobre.dia)}
              cy={y(sobre.massa)}
              r={3.5}
              fill={COR.linha}
              stroke="var(--cartao)"
              strokeWidth={1.5}
            />
            <BalaoGrafico
              x={x(sobre.dia)}
              y={y(sobre.massa)}
              largura={w}
              altura={h}
              titulo={`dia ${sobre.dia}${sobre.dia > hoje ? ' (esperado)' : ''}`}
              linhas={[{ texto: `${Math.round(sobre.massa)} g por pé` }]}
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
