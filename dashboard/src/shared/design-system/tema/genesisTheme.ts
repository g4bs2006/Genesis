/**
 * Tema Genesis: nasceu da linguagem Lightfield do Tesserato (decisão 0002) e,
 * no passo 07, ganhou identidade própria, o "verde-estufa" (decisão 0006):
 * destaque verde-pinho no lugar do preto, cinzas com um leve tom de papel e
 * cantos um pouco mais macios. Legibilidade, contraste e calma continuam.
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

// Superfícies: três degraus (página, painel, cartão). Verde-estufa: o claro
// puxa para papel (um quase nada de amarelo), o escuro para folha à noite.
const pagina = ['#F4F3EF', '#121513'] as const
const painel = ['#F8F7F4', '#171A18'] as const
const cartao = ['#FFFFFF', '#1B1F1C'] as const
// Destaque: verde-pinho. Mais escuro e mais azulado que o verde "ok" do
// semáforo (#45B866), para ninguém confundir botão com "está tudo bem".
// Contraste (WCAG): 5,7:1 sobre a página clara; 10:1 sobre a escura.
const destaque = ['#1F6B57', '#7CCFAF'] as const
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
    // seleção (item ativo da barra, opção marcada): um véu do verde-pinho, não cinza (decisão 0006)
    '--color-neutral': ['rgb(31 107 87 / 0.11)', 'rgb(124 207 175 / 0.14)'],
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

    // ação: o verde-pinho (decisão 0006); letra sobre ele passa 6:1 nos dois temas
    '--color-accent': m(destaque),
    '--color-on-accent': ['#FFFFFF', '#0E1A15'],
    '--color-accent-muted': ['rgb(31 107 87 / 0.09)', 'rgb(124 207 175 / 0.12)'],
    '--color-icon-accent': m(destaque),
    // Foco: o contorno padrão do navegador, não o anel verde arredondado
    // (decisão do Gabriel, passo 08). "auto" é o estilo nativo; a cor
    // -webkit-focus-ring-color é a do Chrome/Safari. O foco continua visível.
    '--focus-outline-color': '-webkit-focus-ring-color',
    '--focus-outline-style': 'auto',
    '--focus-outline-offset': '0px',
    // fundo das dicas (tooltip): quase preto esverdeado no claro, quase branco no escuro
    '--color-background-inverted': ['#16201B', '#E9EEEA'],

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

    // raios: 6, 10 e 14px (o Lightfield usava 5, 8 e 12; um pouco mais macio, decisão 0006)
    '--radius-inner': '6px',
    '--radius-element': '10px',
    '--radius-container': '14px',

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
    '--selecao': ['rgb(31 107 87 / 0.09)', 'rgb(124 207 175 / 0.12)'],
    '--destaque': m(destaque),

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
