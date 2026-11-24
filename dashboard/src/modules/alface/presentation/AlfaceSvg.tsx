import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { gerarAlface, type ParametrosAlface } from '../domain/gerarAlface'

type Props = {
  parametros: ParametrosAlface
  /** estufas diferentes podem ter sementes diferentes; a mesma semente dá a mesma planta */
  semente?: number
  /** largura em px (a altura segue a proporção) */
  largura?: number | string
  /** descrição para leitor de tela, ex.: "Alface no dia 23, 182 g, saudável" */
  rotulo: string
}

/**
 * Desenha a alface. Toda a forma vem de gerarAlface (função pura, testada);
 * aqui só se pinta. Mudanças de estado são suaves (os números caminham até o
 * valor novo em ~600ms), e instantâneas para quem pede menos movimento.
 */
export function AlfaceSvg({ parametros, semente = 1, largura = '100%', rotulo }: Props) {
  const suaves = useParametrosSuaves(parametros)
  const desenho = useMemo(() => gerarAlface(suaves, semente), [suaves, semente])
  // useId: ids únicos por desenho (gradientes e filtros não colidem entre alfaces)
  const id = useId().replace(/:/g, '')

  return (
    <svg viewBox={desenho.viewBox} width={largura} role="img" aria-label={rotulo} style={{ display: 'block' }}>
      <defs>
        <filter id={`${id}-sombra`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        {desenho.folhas.map((f) => (
          <linearGradient
            key={f.indice}
            id={`${id}-g${f.indice}`}
            gradientUnits="userSpaceOnUse"
            x1={f.gradiente.de.x}
            y1={f.gradiente.de.y}
            x2={f.gradiente.ate.x}
            y2={f.gradiente.ate.y}
          >
            <stop offset="0" stopColor={f.gradiente.base} />
            <stop offset="0.55" stopColor={f.gradiente.meio} />
            <stop offset="1" stopColor={f.gradiente.ponta} />
          </linearGradient>
        ))}
        {desenho.folhas.map((f) => (
          <clipPath key={f.indice} id={`${id}-c${f.indice}`}>
            <path d={f.contorno} />
          </clipPath>
        ))}
      </defs>

      {/* o perfil NFT: lado, frente e topo do cano, o furo e o copinho */}
      <g stroke="var(--alface-cano-linha)" strokeWidth="0.6" strokeLinejoin="round">
        <path d={desenho.cano.lado} fill="var(--alface-cano-lado)" />
        <path d={desenho.cano.frente} fill="var(--alface-cano-frente)" />
        <path d={desenho.cano.topo} fill="var(--alface-cano-topo)" />
      </g>
      <ellipse {...elipse(desenho.furo)} fill="var(--alface-furo)" />
      <ellipse {...elipse(desenho.furo, 0.78)} fill="var(--alface-copo)" />

      {desenho.janela && (
        <g>
          <rect
            x={desenho.janela.x}
            y={desenho.janela.y}
            width={desenho.janela.largura}
            height={desenho.janela.altura}
            rx="1.5"
            fill="var(--alface-janela)"
          />
          <rect
            x={desenho.janela.x}
            y={desenho.janela.y + desenho.janela.altura - desenho.janela.agua}
            width={desenho.janela.largura}
            height={desenho.janela.agua}
            fill="var(--alface-agua)"
            opacity="0.8"
          />
          <g stroke="var(--alface-raiz)" strokeWidth="0.9" fill="none" strokeLinecap="round">
            {desenho.raizes.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </g>
      )}

      {/* as folhas, de trás para a frente */}
      {desenho.folhas.map((f) => (
        <g key={f.indice} opacity={f.opacidade}>
          {/* sombra leve sobre as folhas de trás */}
          <path d={f.contorno} fill="black" opacity="0.16" filter={`url(#${id}-sombra)`} transform="translate(0 1.6)" />
          {/* traço fino mais escuro: separa uma folha da outra */}
          <path
            d={f.contorno}
            fill={`url(#${id}-g${f.indice})`}
            stroke={f.dobraCor}
            strokeWidth="0.35"
            strokeOpacity="0.5"
          />
          <g clipPath={`url(#${id}-c${f.indice})`}>
            <g stroke={f.dobraCor} strokeWidth="0.7" fill="none" opacity="0.45" strokeLinecap="round">
              {f.dobras.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g stroke={f.nervuraCor} strokeWidth="0.4" fill="none" opacity="0.35" strokeLinecap="round">
              {f.secundarias.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <path d={f.nervuraCentral} fill={f.nervuraCor} opacity="0.6" />
            {/* bordas queimadas: o contorno em marrom, só a metade de dentro aparece (recorte) */}
            {f.necrose > 0.03 && (
              <path
                d={f.contorno}
                fill="none"
                stroke={f.necroseCor}
                strokeWidth={0.8 + f.necrose * 1.6}
                strokeLinejoin="round"
                opacity={0.25 + f.necrose * 0.6}
              />
            )}
          </g>
        </g>
      ))}
    </svg>
  )
}

const elipse = (e: { cx: number; cy: number; rx: number; ry: number }, k = 1) => ({
  cx: e.cx,
  cy: e.cy,
  rx: e.rx * k,
  ry: e.ry * k,
})

const DURACAO_MS = 600

/** Faz os parâmetros caminharem até o alvo (transição suave entre estados). */
function useParametrosSuaves(alvo: ParametrosAlface): ParametrosAlface {
  const [atual, setAtual] = useState(alvo)
  const atualRef = useRef(alvo)
  const { massa, turgor, clorose, necrose } = alvo
  useEffect(() => {
    const destino = { massa, turgor, clorose, necrose }
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const inicio = atualRef.current
    const t0 = performance.now()
    let quadro = 0
    const passo = (agora: number) => {
      const t = reduzir ? 1 : Math.min(1, (agora - t0) / DURACAO_MS)
      const e = 1 - Math.pow(1 - t, 3) // desacelera no fim
      const proximo = {
        massa: inicio.massa + (destino.massa - inicio.massa) * e,
        turgor: inicio.turgor + (destino.turgor - inicio.turgor) * e,
        clorose: inicio.clorose + (destino.clorose - inicio.clorose) * e,
        necrose: inicio.necrose + (destino.necrose - inicio.necrose) * e,
      }
      atualRef.current = proximo
      setAtual(proximo)
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [massa, turgor, clorose, necrose])
  return atual
}
