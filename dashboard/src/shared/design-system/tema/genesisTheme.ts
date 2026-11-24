/**
 * Tema Genesis: a linguagem Lightfield do Tesserato aplicada ao Astryx.
 *
 * Um tema do Astryx é um conjunto de variáveis CSS (tokens). Cada componente do
 * Astryx lê essas variáveis, então trocar o valor aqui muda o app inteiro sem
 * editar componente nenhum. Cada valor vem em par [claro, escuro].
 *
 * Fonte dos valores: Tesserato, src/shared/design-system/styles/globals.css
 * (medidos nas telas do Lightfield). Decisão: docs/decisoes/0002-tema.md.
 *
 * Regra: nenhum componente usa hex solto. Cor nova entra aqui como token.
 */
import { defineTheme } from '@astryxdesign/core/theme'

// Texto: o mesmo preto (ou branco, no escuro) em quatro opacidades.
// Texto pequeno nunca usa menos que o nível 3 (56%), por contraste.
const texto = ['rgb(0 0 0 / 0.85)', 'rgb(255 255 255 / 0.92)'] as const
const texto2 = ['rgb(0 0 0 / 0.72)', 'rgb(255 255 255 / 0.76)'] as const
const texto3 = ['rgb(0 0 0 / 0.56)', 'rgb(255 255 255 / 0.58)'] as const
const texto4 = ['rgb(0 0 0 / 0.42)', 'rgb(255 255 255 / 0.42)'] as const

// Superfícies: três degraus (página, painel, cartão)
const pagina = ['#F5F5F5', '#151515'] as const
const painel = ['#F9F9F9', '#1A1A1A'] as const
const cartao = ['#FFFFFF', '#202020'] as const
const linha = ['rgb(0 0 0 / 0.06)', 'rgb(255 255 255 / 0.07)'] as const
const linha2 = ['rgb(0 0 0 / 0.12)', 'rgb(255 255 255 / 0.12)'] as const

// Semáforo: cor só onde informa. Iguais nos dois temas, exceto o texto,
// que precisa de mais contraste em letra pequena do que a bolinha.
const ok = '#45B866'
const atencao = '#E2B23B'
const risco = '#E5534B'
const riscoTexto = ['#B8322B', '#FF7B72'] as const
// Verde e amarelo puros não passam 4,5:1 como texto sobre branco: versões
// mais escuras (claro) e mais claras (escuro) só para letra.
const okTexto = ['#2C7D45', '#6FD08C'] as const
const atencaoTexto = ['#7A5C0C', '#E9C766'] as const

const m = (par: readonly [string, string]) => [...par] as [string, string]

export const genesisTheme = defineTheme({
  name: 'genesis',

  typography: {
    // 15px de corpo, como no Tesserato; degraus pequenos (app denso de dados)
    scale: { base: 15, ratio: 1.2 },
    body: {
      family: 'Geist Variable',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    heading: { weight: 'medium' },
    // Números, horários e rótulos de dado usam a mono (algarismos tabulares)
    code: { family: 'Geist Mono Variable', fallbacks: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  },

  tokens: {
    // superfícies
    '--color-background-body': m(pagina),
    '--color-background-surface': m(painel),
    '--color-background-card': m(cartao),
    '--color-background-popover': m(cartao),
    '--color-background-muted': ['rgb(0 0 0 / 0.045)', 'rgb(255 255 255 / 0.07)'],
    // Os neutros do Astryx são cinza-azulados; no Lightfield o cinza é puro
    // (preto ou branco com opacidade). Seleção, hover, trilhos e sombras.
    '--color-neutral': ['rgb(0 0 0 / 0.06)', 'rgb(255 255 255 / 0.1)'],
    '--color-overlay-hover': ['rgb(0 0 0 / 0.03)', 'rgb(255 255 255 / 0.04)'],
    '--color-overlay-pressed': ['rgb(0 0 0 / 0.06)', 'rgb(255 255 255 / 0.08)'],
    '--color-overlay': ['rgb(0 0 0 / 0.4)', 'rgb(0 0 0 / 0.6)'],
    '--color-track': ['rgb(0 0 0 / 0.1)', 'rgb(255 255 255 / 0.14)'],
    '--color-skeleton': ['rgb(0 0 0 / 0.08)', 'rgb(255 255 255 / 0.1)'],
    '--color-shadow': ['rgb(0 0 0 / 0.08)', 'rgb(0 0 0 / 0.3)'],
    '--color-border': m(linha2),
    '--color-border-emphasized': ['rgb(0 0 0 / 0.2)', 'rgb(255 255 255 / 0.2)'],

    // texto e ícones
    '--color-text-primary': m(texto),
    '--color-text-secondary': m(texto3),
    '--color-text-disabled': m(texto4),
    '--color-text-accent': m(texto),
    '--color-icon-primary': m(texto),
    '--color-icon-secondary': m(texto3),
    '--color-icon-disabled': m(texto4),

    // ação: preto no claro, quase branco no escuro (sem azul de marca)
    '--color-accent': ['#0E0E0E', '#F2F2F2'],
    '--color-on-accent': ['#FFFFFF', '#111111'],
    '--color-accent-muted': ['rgb(0 0 0 / 0.05)', 'rgb(255 255 255 / 0.08)'],
    '--color-icon-accent': m(texto),
    // anel de foco opaco: passa 3:1 contra a página nos dois temas (WCAG 1.4.11)
    '--focus-outline-color': ['#2F6FC4', '#6AAEF5'],

    // semáforo
    '--color-success': ok,
    '--color-warning': atencao,
    '--color-error': risco,
    '--color-text-success': m(okTexto),
    '--color-text-warning': m(atencaoTexto),
    '--color-text-error': m(riscoTexto),
    '--color-icon-success': ok,
    '--color-icon-warning': atencao,
    '--color-icon-error': risco,
    '--color-border-success': ok,
    '--color-border-warning': atencao,
    '--color-border-error': risco,

    // título grande de 28px (regra do celular, igual ao Tesserato)
    '--text-heading-1-size': '28px',

    // Movimento: uma fonte só. Os tempos do Astryx viram os do Tesserato
    // (mais curtos e calmos), e as nossas animações leem os mesmos tokens.
    '--duration-fast-min': '120ms',
    '--duration-fast': '160ms',
    '--duration-fast-max': '200ms',
    '--duration-medium-min': '280ms',
    '--duration-medium': '340ms',
    '--duration-medium-max': '420ms',
    // curva das folhas do iOS: desacelera sem passar do ponto
    '--ease-standard': 'cubic-bezier(0.32, 0.72, 0, 1)',
    '--ease-entrance': 'cubic-bezier(0.32, 0.72, 0, 1)',
    '--ease-move': 'cubic-bezier(0.32, 0.72, 0, 1)',

    // raios do Lightfield: 5, 8 e 12px
    '--radius-inner': '5px',
    '--radius-element': '8px',
    '--radius-container': '12px',

    '--shadow-low': [
      '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.05)',
      '0 1px 2px rgb(0 0 0 / 0.3), 0 8px 24px rgb(0 0 0 / 0.35)',
    ],

    // gráficos do Astryx seguem a paleta fixa do Tesserato
    '--color-data-categorical-blue': '#4B9CF2',
    '--color-data-categorical-green': ok,
    '--color-data-categorical-purple': '#8B6FF0',
    '--color-data-categorical-orange': '#EE8B45',
    '--color-data-categorical-teal': '#3FB8A8',
    '--color-data-neutral': '#8E8E93',
  },

  // Tokens próprios do Genesis, usados pelos nossos componentes (CSS Modules).
  // Mesmos nomes do Tesserato para facilitar a leitura entre os dois projetos.
  localTokens: {
    '--pagina': m(pagina),
    '--painel': m(painel),
    '--cartao': m(cartao),
    '--texto': m(texto),
    '--texto-2': m(texto2),
    '--texto-3': m(texto3),
    '--texto-4': m(texto4),
    '--linha': m(linha),
    '--linha-2': m(linha2),
    '--hover': ['rgb(0 0 0 / 0.03)', 'rgb(255 255 255 / 0.04)'],
    '--selecao': ['rgb(0 0 0 / 0.045)', 'rgb(255 255 255 / 0.07)'],

    '--ok': ok,
    '--atencao': atencao,
    '--risco': risco,
    '--risco-texto': m(riscoTexto),
    '--ok-texto': m(okTexto),
    '--atencao-texto': m(atencaoTexto),

    // Cores de série: estufas e controladores nos gráficos (paleta fixa)
    '--serie-azul': '#4B9CF2',
    '--serie-verde': ok,
    '--serie-amarelo': atencao,
    '--serie-roxo': '#8B6FF0',
    '--serie-laranja': '#EE8B45',
    '--serie-menta': '#3FB8A8',
    '--serie-cinza': '#8E8E93',

    // Atalhos para os tokens de movimento do Astryx (definidos acima)
    '--mov-rapido': 'var(--duration-fast-min)',
    '--mov-base': 'var(--duration-fast-max)',
    '--mov-lento': 'var(--duration-medium)',
    '--ease-ios': 'var(--ease-standard)',

    // Celular: alvo de toque mínimo e título grande
    '--toque-minimo': '44px',
    '--titulo-grande': '28px',
  },
})
