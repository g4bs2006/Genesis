import { AxisBottom, AxisLeft } from '@visx/axis'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { COR, rotuloEixo } from './estilo'

export type PontoGeracao = { numero: number; melhor: number; mediana: number; regras: number }
export type FaixaFase = { fase: number; inicio: number; fim: number }

type Props = {
  geracoes: PontoGeracao[]
  fases: FaixaFase[]
  formatarNota: (v: number) => string
  altura?: number
  /** gerações destacadas (ex.: as duas comparadas) */
  marcas?: number[]
}

/**
 * Curva de aprendizado: a nota da melhor rede e da rede mediana a cada
 * geração, a linha das regras fixas e faixas de fundo marcando cada fase do
 * currículo. A queda ao entrar numa fase nova é esperada: o problema ficou
 * mais difícil.
 */
export function CurvaAprendizado(props: Props) {
  const altura = props.altura ?? 280
  return (
    <ParentSize debounceTime={50} style={{ width: '100%', height: altura }}>
      {({ width }) => (width > 0 ? <Desenho {...props} altura={altura} largura={width} /> : null)}
    </ParentSize>
  )
}

function Desenho({
  geracoes,
  fases,
  formatarNota,
  altura,
  largura,
  marcas = [],
}: Props & { altura: number; largura: number }) {
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

  return (
    <svg
      width={largura}
      height={altura}
      role="img"
      aria-label="Curva de aprendizado: nota da melhor rede, da mediana e das regras fixas por geração"
    >
      <Group left={m.esquerda} top={m.topo}>
        {fases.map((f, i) => (
          <g key={f.fase}>
            <rect
              x={x(f.inicio)}
              width={Math.max(0, x(f.fim) - x(f.inicio))}
              y={0}
              height={h}
              fill={i % 2 ? 'var(--hover)' : 'var(--selecao)'}
            />
            <text x={x(f.inicio) + 6} y={-8} {...rotuloEixo}>
              fase {f.fase}
            </text>
          </g>
        ))}
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
          numTicks={8}
          hideTicks
          stroke={COR.grade}
          tickFormat={(v) => `g${v}`}
          tickLabelProps={{ ...rotuloEixo, textAnchor: 'middle' }}
        />
      </Group>
    </svg>
  )
}
