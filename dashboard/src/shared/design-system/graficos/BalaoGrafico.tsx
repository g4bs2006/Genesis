import { rotuloEixo } from './estilo'

export type LinhaBalao = { texto: string; cor?: string; tracejada?: boolean }

// Geist Mono 11px: cada caractere tem ~6,7px (fonte mono, largura fixa).
// shortcut: largura estimada, não medida; trocar por getComputedTextLength se aparecer texto estourando.
const LARGURA_CARACTERE = 6.7
const ALTURA_LINHA = 16

/**
 * O valor exato sob o ponteiro, num balão dentro do próprio SVG (cabe em
 * qualquer card sem ser cortado: vira para a esquerda perto da borda direita).
 * A letra usa as cores de texto; a cor da série vai só no tracinho ao lado.
 */
export function BalaoGrafico({
  x,
  y,
  largura,
  altura,
  titulo,
  linhas,
}: {
  /** ponto de ancoragem (coordenadas da área do gráfico) */
  x: number
  y: number
  /** tamanho da área útil, para o balão não sair dela */
  largura: number
  altura: number
  titulo: string
  linhas: LinhaBalao[]
}) {
  const comMarca = linhas.some((l) => l.cor)
  const maior = Math.max(titulo.length, ...linhas.map((l) => l.texto.length + (comMarca ? 3 : 0)))
  const w = Math.ceil(maior * LARGURA_CARACTERE) + 16
  const h = (linhas.length + 1) * ALTURA_LINHA + 10
  const bx = x + 12 + w > largura ? Math.max(0, x - 12 - w) : x + 12
  const by = Math.min(Math.max(0, y - h / 2), Math.max(0, altura - h))
  return (
    <g transform={`translate(${bx},${by})`} pointerEvents="none">
      <rect width={w} height={h} rx={6} fill="var(--cartao)" stroke="var(--linha-2)" />
      <text x={8} y={ALTURA_LINHA} {...rotuloEixo} fill="var(--texto-2)">
        {titulo}
      </text>
      {linhas.map((l, i) => {
        const ly = (i + 2) * ALTURA_LINHA
        return (
          <g key={i}>
            {l.cor && (
              <line
                x1={8}
                x2={20}
                y1={ly - 4}
                y2={ly - 4}
                stroke={l.cor}
                strokeWidth={2}
                strokeDasharray={l.tracejada ? '3 2' : undefined}
              />
            )}
            <text x={l.cor ? 26 : 8} y={ly} {...rotuloEixo} fill="var(--texto)">
              {l.texto}
            </text>
          </g>
        )
      })}
    </g>
  )
}
