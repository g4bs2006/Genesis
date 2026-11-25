/* eslint-disable react-refresh/only-export-components -- os ícones saem de par() e não guardam estado: editar este arquivo só recarrega a página */
import type { ReactNode, SVGProps } from 'react'

/**
 * Os ícones do Genesis (decisão 0006): cada um diz o que a página é no
 * contexto da estufa, em vez de um desenho genérico (casinha, relógio...).
 *
 * Um conjunto só, no mesmo traço do broto da marca: grade de 24, traço 1,6,
 * pontas e cantos redondos, cor do texto em volta (currentColor). Cada ícone
 * tem duas versões: contorno (padrão) e cheia (aba ativa no celular, onde a
 * cor sozinha é pouco para dizer "você está aqui"). Na cheia, o corpo é
 * pintado e os detalhes de dentro viram "recorte" na cor do fundo da barra.
 */

type Props = SVGProps<SVGSVGElement>
/** Desenha o ícone; `cheio` pinta o corpo e recorta os detalhes. */
type Desenho = (cheio: boolean) => ReactNode

// fundo da barra de abas (BarraAbas.module.css): os detalhes da versão cheia
const RECORTE = 'var(--painel)'

function Svg({ children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

/** Cria o par [contorno, cheio] a partir de um desenho só (o traço é o mesmo). */
function par(desenho: Desenho) {
  const Contorno = (props: Props) => <Svg {...props}>{desenho(false)}</Svg>
  const Cheio = (props: Props) => <Svg {...props}>{desenho(true)}</Svg>
  return [Contorno, Cheio] as const
}

const corpo = (cheio: boolean) => (cheio ? 'currentColor' : 'none')
const detalhe = (cheio: boolean) => (cheio ? RECORTE : 'currentColor')

/** Agora: a estufa (arco de plástico) com o broto dentro. */
export const [IconeEstufa, IconeEstufaCheio] = par((c) => (
  <>
    <path d="M4 20V11a8 8 0 0 1 16 0v9Z" fill={corpo(c)} />
    <path d="M2.5 20h19" />
    <g stroke={detalhe(c)}>
      <path d="M12 20v-4.5" />
      <path d="M12 17c0-2-1.4-3.2-3.4-3.2 0 2 1.4 3.2 3.4 3.2Z" />
      <path d="M12 15.5c0-1.8 1.3-3 3.2-3 0 1.8-1.3 3-3.2 3Z" />
    </g>
  </>
))

/** Histórico: as leituras de antes (seta voltando no tempo em volta da curva). */
export const [IconeHistorico, IconeHistoricoCheio] = par((c) => (
  <>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" fill={corpo(c)} />
    <path d="M3.5 3.5V8h4.5" />
    <path d="m7.5 13 2-2 2.5 3 2.5-4 2 2.5" stroke={detalhe(c)} />
  </>
))

/** Ciclo: a alface crescendo, da muda pequena à cabeça pronta. */
export const [IconeCiclo, IconeCicloCheio] = par((c) => (
  <>
    <path d="M2.5 20h19" />
    <path d="M5 20v-3.5" />
    <path d="M5 17.5c-1.8 0-2.7-1.1-2.7-2.7 1.7 0 2.7 1 2.7 2.7Z" />
    <path d="M5 16.5c0-1.4.9-2.3 2.3-2.3 0 1.4-.9 2.3-2.3 2.3Z" />
    {/* a alface ampliada a partir do chão: fica da altura dos outros ícones */}
    <g transform="translate(15 20) scale(1.25) translate(-15 -20)">
      <path
        d="M15 20c-4 0-6-2.6-6-5.5 1.7 0 3 .7 3.6 1.7-.3-3 1-5.6 2.4-6.8 1.4 1.2 2.7 3.8 2.4 6.8.6-1 1.9-1.7 3.6-1.7 0 2.9-2 5.5-6 5.5Z"
        fill={corpo(c)}
        strokeWidth={1.6 / 1.25}
      />
      <path d="M15 20v-4.5" stroke={detalhe(c)} strokeWidth={1.6 / 1.25} />
    </g>
  </>
))

/** Dinheiro: a nota com uma folha no meio (o que a alface rende). */
export const [IconeDinheiro, IconeDinheiroCheio] = par((c) => (
  <>
    <rect x={2.5} y={6} width={19} height={12} rx={2.5} fill={corpo(c)} />
    <g stroke={detalhe(c)}>
      <path d="M9 15c0-3 2.2-5.5 6-5.5 0 3-2.2 5.5-6 5.5Z" />
      <path d="m9 15 3.2-2.8" />
    </g>
  </>
))

/** Agente × regras: a balança, os dois controladores no mesmo prato. */
export const [IconeComparar, IconeCompararCheio] = par((c) => (
  <>
    <path d="M12 4v16M8.5 20h7M5 7h14" />
    <path d="M2.5 13a2.5 2.5 0 0 0 5 0L5 7Z" fill={corpo(c)} />
    <path d="M16.5 13a2.5 2.5 0 0 0 5 0L19 7Z" fill={corpo(c)} />
  </>
))

/** Ajustes: os controles deslizantes (o que se regula). */
export const [IconeAjustes, IconeAjustesCheio] = par((c) => (
  <>
    <path d="M3.5 7.5H13M18 7.5h2.5M3.5 16.5H6M11 16.5h9.5" />
    <circle cx={15.5} cy={7.5} r={2.3} fill={corpo(c)} />
    <circle cx={8.5} cy={16.5} r={2.3} fill={corpo(c)} />
  </>
))

/** Estufas lado a lado: quatro estufas, o mesmo clima para todas. */
export const [IconeEstufas, IconeEstufasCheio] = par((c) => (
  <>
    <path d="M3.5 11V7.5a3.5 3.5 0 0 1 7 0V11Z" fill={corpo(c)} />
    <path d="M13.5 11V7.5a3.5 3.5 0 0 1 7 0V11Z" fill={corpo(c)} />
    <path d="M3.5 20.5V17a3.5 3.5 0 0 1 7 0v3.5Z" fill={corpo(c)} />
    <path d="M13.5 20.5V17a3.5 3.5 0 0 1 7 0v3.5Z" fill={corpo(c)} />
  </>
))

/** Treino: a curva da nota subindo, geração a geração (os pontos). */
export const [IconeTreino, IconeTreinoCheio] = par((c) => (
  <>
    <path d="M3.5 3.5v17h17" />
    <path d="m7 16 3.5-4.5 3 2 5-6.5" />
    <circle cx={10.5} cy={11.5} r={1.4} fill={corpo(c)} />
    <circle cx={13.5} cy={13.5} r={1.4} fill={corpo(c)} />
    <circle cx={18.5} cy={7} r={1.4} fill={corpo(c)} />
  </>
))

/** Modelo: a rede (entradas, camada do meio, saída) e as ligações. */
export const [IconeRede, IconeRedeCheio] = par((c) => (
  <>
    <path d="m6.3 8.6 4.4-2.8M6.3 8.6l4.2 3.4M6.3 15.4l4.2-3.4M6.3 15.4l4.4 2.8M13.5 6l4.2 4.9M13.5 12h4M13.5 18l4.2-4.9" />
    <circle cx={5} cy={8.5} r={1.8} fill={corpo(c)} />
    <circle cx={5} cy={15.5} r={1.8} fill={corpo(c)} />
    <circle cx={12} cy={5} r={1.8} fill={corpo(c)} />
    <circle cx={12} cy={12} r={1.8} fill={corpo(c)} />
    <circle cx={12} cy={19} r={1.8} fill={corpo(c)} />
    <circle cx={19} cy={12} r={1.8} fill={corpo(c)} />
  </>
))

/** Gravações: a reprodução de um ciclo gravado (play e a barra do tempo). */
export const [IconeGravacao, IconeGravacaoCheio] = par((c) => (
  <>
    <rect x={3} y={4.5} width={18} height={15} rx={2.5} fill={corpo(c)} />
    <g stroke={detalhe(c)}>
      <path d="M10 8.5v5l4.3-2.5Z" />
      <path d="M6.5 16.5h11" />
    </g>
  </>
))

/** Tema claro (o sol) e escuro (a lua), no mesmo traço dos outros. */
export const [IconeSol] = par(() => (
  <>
    <circle cx={12} cy={12} r={4} />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </>
))
export const [IconeLua] = par(() => <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />)
