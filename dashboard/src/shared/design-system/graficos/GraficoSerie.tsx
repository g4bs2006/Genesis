import { useState, type PointerEvent } from 'react'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { curveMonotoneX } from '@visx/curve'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear, scaleTime } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { VStack } from '@astryxdesign/core/VStack'
import { BalaoGrafico } from './BalaoGrafico'
import { COR, rotuloEixo } from './estilo'
import { LegendaGrafico } from './LegendaGrafico'

export type PontoSerie = { t: number; v: number }
export type Serie = { nome: string; cor: string; pontos: PontoSerie[]; tracejada?: boolean }
/** Uma trilha de ação embaixo do gráfico: intensidade (0..1, em tons) ou doses (pontos) */
export type TrilhaAcao = { nome: string; tipo: 'intensidade' | 'pontos'; pontos: PontoSerie[]; cor: string }

type Props = {
  series: Serie[]
  /** a faixa boa, sombreada atrás das linhas */
  faixa?: [number, number]
  acoes?: TrilhaAcao[]
  altura?: number
  rotulo: string
  formatarValor: (v: number) => string
  formatarTempo: (t: number) => string
  /** mostra o instante sob o ponteiro (e avisa quem quiser seguir junto) */
  aoMoverInstante?: (t: number | null) => void
  /** instante marcado de fora (ex.: o arraste de outro gráfico) */
  instante?: number | null
}

const ALTURA_TRILHA = 16

/**
 * Série no tempo com a faixa boa e as ações do controlador embaixo.
 * É o gráfico das "Últimas 24 horas", do Histórico e das estufas lado a lado.
 * Ponteiro em cima: balão com a hora e o valor exato de cada linha. Com duas
 * linhas ou mais, a legenda aparece embaixo.
 */
export function GraficoSerie(props: Props) {
  const altura = (props.altura ?? 240) + (props.acoes?.length ?? 0) * ALTURA_TRILHA + (props.acoes?.length ? 10 : 0)
  return (
    <VStack gap={2}>
      <ParentSize debounceTime={50} initialSize={{ width: 300, height: 0 }} style={{ width: '100%', height: altura }}>
        {({ width }) => (width > 0 ? <Desenho {...props} largura={width} /> : null)}
      </ParentSize>
      <LegendaGrafico itens={props.series} />
    </VStack>
  )
}

function Desenho({
  series,
  faixa,
  acoes = [],
  altura = 240,
  rotulo,
  formatarValor,
  formatarTempo,
  aoMoverInstante,
  instante,
  largura,
}: Props & { largura: number }) {
  const [sobre, setSobre] = useState<number | null>(null)
  const m = { topo: 12, direita: 12, baixo: 24, esquerda: 88 }
  const w = Math.max(10, largura - m.esquerda - m.direita)
  const h = altura - m.topo - m.baixo
  const todos = series.flatMap((s) => s.pontos)
  if (todos.length < 2) return <svg width={largura} height={altura} role="img" aria-label={rotulo} />

  const t0 = Math.min(...todos.map((p) => p.t))
  const t1 = Math.max(...todos.map((p) => p.t))
  const valores = [...todos.map((p) => p.v), ...(faixa ?? [])]
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const folga = (max - min) * 0.08 || 1
  const x = scaleTime({ domain: [t0, t1], range: [0, w] })
  const y = scaleLinear({ domain: [min - folga, max + folga], range: [h, 0], nice: true })
  const passoX = w / Math.max(1, (series[0]?.pontos.length ?? 2) - 1)
  const marcado = instante ?? sobre
  // série ainda sem passos (estufa carregando) fica fora da leitura do ponteiro
  const comPontos = series.filter((s) => s.pontos.length > 0)

  const mover = (e: PointerEvent<SVGRectElement>) => {
    const caixa = e.currentTarget.getBoundingClientRect()
    const t = x.invert(Math.min(w, Math.max(0, e.clientX - caixa.left))).getTime()
    setSobre(t)
    aoMoverInstante?.(t)
  }
  const sair = () => {
    setSobre(null)
    aoMoverInstante?.(null)
  }
  const maisPerto = (pontos: PontoSerie[], t: number) =>
    pontos.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a), pontos[0]!)

  return (
    <svg
      width={largura}
      height={altura + acoes.length * ALTURA_TRILHA + (acoes.length ? 10 : 0)}
      role="img"
      aria-label={rotulo}
    >
      <Group left={m.esquerda} top={m.topo}>
        {faixa && (
          <rect
            x={0}
            width={w}
            y={y(faixa[1])}
            height={Math.max(0, y(faixa[0]) - y(faixa[1]))}
            fill={COR.faixa}
            opacity={0.09}
          />
        )}
        <AxisLeft
          scale={y}
          numTicks={4}
          hideAxisLine
          hideTicks
          tickFormat={(v) => formatarValor(Number(v))}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'end', dx: -6, dy: 3 }}
        />
        {y.ticks(4).map((v) => (
          <line key={v} x1={0} x2={w} y1={y(v)} y2={y(v)} stroke={COR.grade} />
        ))}
        {series.map((s) => (
          <LinePath
            key={s.nome}
            data={s.pontos}
            x={(p) => x(p.t)}
            y={(p) => y(p.v)}
            curve={curveMonotoneX}
            stroke={s.cor}
            strokeWidth={s.tracejada ? 1.5 : 2}
            strokeDasharray={s.tracejada ? '5 4' : undefined}
            opacity={s.tracejada ? 0.75 : 1}
          />
        ))}
        {faixa && (
          // a faixa boa é a referência do gráfico: tem nome, não só cor
          <text
            x={w - 4}
            y={y(faixa[1]) + 12}
            textAnchor="end"
            {...rotuloEixo}
            fill="var(--ok-texto)"
            // contorno da cor do cartão: desenhado depois das linhas, fica por cima delas e legível
            stroke="var(--cartao)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            faixa boa
          </text>
        )}
        <AxisBottom
          top={h}
          scale={x}
          numTicks={Math.max(3, Math.floor(w / 90))}
          hideTicks
          stroke={COR.grade}
          tickFormat={(d) => formatarTempo((d as Date).getTime())}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'middle' }}
        />

        {/* trilhas das ações do controlador */}
        <Group top={h + m.baixo + 6}>
          {acoes.map((a, i) => (
            <Group key={a.nome} top={i * ALTURA_TRILHA}>
              <text x={-8} y={ALTURA_TRILHA / 2 + 3} textAnchor="end" {...rotuloEixo}>
                {a.nome}
              </text>
              <rect x={0} width={w} y={2} height={ALTURA_TRILHA - 4} fill={COR.grade} rx={3} />
              {a.tipo === 'intensidade'
                ? trechos(a.pontos).map((p) =>
                    p.v > 0.02 ? (
                      <rect
                        key={p.t}
                        x={x(p.t)}
                        width={Math.max(1, x(p.fim) - x(p.t) + passoX)}
                        y={2}
                        height={ALTURA_TRILHA - 4}
                        fill={a.cor}
                        opacity={0.15 + 0.85 * Math.min(1, p.v)}
                      />
                    ) : null,
                  )
                : a.pontos.map((p) =>
                    p.v > 0 ? (
                      <circle
                        key={p.t}
                        cx={x(p.t)}
                        cy={ALTURA_TRILHA / 2}
                        r={2.5 + Math.min(3, p.v / 3)}
                        fill={a.cor}
                      />
                    ) : null,
                  )}
            </Group>
          ))}
        </Group>

        {/* instante sob o ponteiro: linha e leitura dos valores */}
        {marcado != null && marcado >= t0 && marcado <= t1 && (
          <Group>
            <line x1={x(marcado)} x2={x(marcado)} y1={0} y2={h} stroke={COR.eixo} strokeDasharray="2 3" />
            {comPontos.map((s) => {
              const p = maisPerto(s.pontos, marcado)
              return (
                <circle
                  key={s.nome}
                  cx={x(p.t)}
                  cy={y(p.v)}
                  r={3.5}
                  fill={s.cor}
                  stroke="var(--cartao)"
                  strokeWidth={1.5}
                />
              )
            })}
          </Group>
        )}
        {marcado != null && marcado >= t0 && marcado <= t1 && (
          <BalaoGrafico
            x={x(marcado)}
            y={y(maisPerto(comPontos[0]!.pontos, marcado).v)}
            largura={w}
            altura={h}
            titulo={formatarTempo(marcado)}
            linhas={comPontos.map((s) => ({
              texto: `${series.length > 1 ? `${s.nome} ` : ''}${formatarValor(maisPerto(s.pontos, marcado).v)}`,
              cor: series.length > 1 ? s.cor : undefined,
              tracejada: s.tracejada,
            }))}
          />
        )}
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill="transparent"
          onPointerMove={mover}
          onPointerLeave={sair}
          style={{ touchAction: 'pan-y' }}
        />
      </Group>
    </svg>
  )
}

/**
 * Junta passos vizinhos de intensidade parecida (diferença < 0,05) num trecho
 * só: 144 retângulos viram uns 20, e o gráfico fica leve a cada passo novo.
 */
function trechos(pontos: PontoSerie[]): (PontoSerie & { fim: number })[] {
  const saida: (PontoSerie & { fim: number })[] = []
  for (const p of pontos) {
    const ultimo = saida.at(-1)
    if (ultimo && Math.abs(ultimo.v - p.v) < 0.05) ultimo.fim = p.t
    else saida.push({ ...p, fim: p.t })
  }
  return saida
}
