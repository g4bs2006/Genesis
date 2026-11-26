import { useState, type PointerEvent } from 'react'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { VStack } from '@astryxdesign/core/VStack'
import { BalaoGrafico } from './BalaoGrafico'
import { COR, rotuloEixo } from './estilo'
import { LegendaGrafico } from './LegendaGrafico'

export type PontoGeracao = { numero: number; melhor: number; mediana: number; regras: number }

type Props = {
  geracoes: PontoGeracao[]
  formatarNota: (v: number) => string
  altura?: number
  /** gerações destacadas (ex.: as duas comparadas) */
  marcas?: number[]
}

/**
 * Curva de aprendizado: a nota da melhor rede e da rede mediana a cada
 * geração e a linha das regras fixas no mesmo clima. Ponteiro em cima: balão
 * com as três notas daquela geração.
 */
export function CurvaAprendizado(props: Props) {
  const altura = props.altura ?? 280
  return (
    <VStack gap={2}>
      <ParentSize debounceTime={50} style={{ width: '100%', height: altura }}>
        {({ width }) => (width > 0 ? <Desenho {...props} altura={altura} largura={width} /> : null)}
      </ParentSize>
      <LegendaGrafico itens={LINHAS} />
    </VStack>
  )
}

/** As três linhas, na mesma ordem e cor em todo lugar onde a curva aparece. */
const LINHAS = [
  { nome: 'melhor rede', cor: 'var(--serie-verde)' },
  { nome: 'rede mediana', cor: 'var(--serie-azul)' },
  { nome: 'regras fixas', cor: 'var(--serie-cinza)', tracejada: true },
]

function Desenho({
  geracoes,
  formatarNota,
  altura,
  largura,
  marcas = [],
}: Props & { altura: number; largura: number }) {
  const [sobre, setSobre] = useState<number | null>(null)
  const m = { topo: 22, direita: 12, baixo: 26, esquerda: 64 }
  const w = largura - m.esquerda - m.direita
  const h = altura - m.topo - m.baixo
  if (geracoes.length < 2) return <svg width={largura} height={altura} />
  const ultima = geracoes.at(-1)!.numero
  const valores = geracoes.flatMap((g) => [g.melhor, g.mediana, g.regras])
  const x = scaleLinear({ domain: [geracoes[0]!.numero, ultima], range: [0, w] })
  const y = scaleLinear({ domain: [Math.min(...valores), Math.max(...valores)], range: [h, 0], nice: true })
  // menos pontos que pixels: uma amostra a cada ~2 px mantém o desenho leve
  const passo = Math.max(1, Math.floor(geracoes.length / (w / 2)))
  const amostra = geracoes.filter((_, i) => i % passo === 0 || i === geracoes.length - 1)
  const mover = (e: PointerEvent<SVGRectElement>) => {
    const caixa = e.currentTarget.getBoundingClientRect()
    const n = x.invert(Math.min(w, Math.max(0, e.clientX - caixa.left)))
    // as gerações são inteiras e em ordem: o índice sai da conta, sem busca
    setSobre(Math.round(n) - geracoes[0]!.numero)
  }
  const g = sobre == null ? undefined : geracoes[Math.min(geracoes.length - 1, Math.max(0, sobre))]

  return (
    <svg
      width={largura}
      height={altura}
      role="img"
      aria-label="Curva de aprendizado: nota da melhor rede, da mediana e das regras fixas por geração"
    >
      <Group left={m.esquerda} top={m.topo}>
        {y.ticks(4).map((v) => (
          <line key={v} x1={0} x2={w} y1={y(v)} y2={y(v)} stroke={COR.grade} />
        ))}
        <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={COR.eixo} strokeOpacity={0.4} />
        <LinePath
          data={amostra}
          x={(g) => x(g.numero)}
          y={(g) => y(g.regras)}
          stroke="var(--serie-cinza)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <LinePath
          data={amostra}
          x={(g) => x(g.numero)}
          y={(g) => y(g.mediana)}
          stroke="var(--serie-azul)"
          strokeWidth={1.25}
          opacity={0.6}
        />
        <LinePath
          data={amostra}
          x={(g) => x(g.numero)}
          y={(g) => y(g.melhor)}
          stroke="var(--serie-verde)"
          strokeWidth={2}
        />
        {marcas.map((n) => (
          <line key={n} x1={x(n)} x2={x(n)} y1={0} y2={h} stroke="var(--texto-2)" strokeDasharray="2 3" />
        ))}
        <AxisLeft
          scale={y}
          numTicks={4}
          hideAxisLine
          hideTicks
          tickFormat={(v) => formatarNota(Number(v))}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'end', dx: -6, dy: 3 }}
        />
        <AxisBottom
          top={h}
          scale={x}
          // um rótulo a cada ~80 px: no celular não encostam
          numTicks={Math.max(2, Math.min(8, Math.floor(w / 80)))}
          hideTicks
          stroke={COR.grade}
          tickFormat={(v) => `g${v}`}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'middle' }}
        />
        {g && (
          <>
            <line x1={x(g.numero)} x2={x(g.numero)} y1={0} y2={h} stroke={COR.eixo} strokeDasharray="2 3" />
            <circle
              cx={x(g.numero)}
              cy={y(g.melhor)}
              r={3.5}
              fill="var(--serie-verde)"
              stroke="var(--cartao)"
              strokeWidth={1.5}
            />
            <BalaoGrafico
              x={x(g.numero)}
              y={y(g.melhor)}
              largura={w}
              altura={h}
              titulo={`geração ${g.numero}`}
              linhas={[
                { texto: `melhor ${formatarNota(g.melhor)}`, cor: LINHAS[0]!.cor },
                { texto: `mediana ${formatarNota(g.mediana)}`, cor: LINHAS[1]!.cor },
                { texto: `regras ${formatarNota(g.regras)}`, cor: LINHAS[2]!.cor, tracejada: true },
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
