/**
 * O que a tela "Agora" diz, em linguagem de produtor: a frase de estado, os
 * grupos de variáveis e o alerta que conta o que o controle já fez. O
 * produtor não sabe o que é "agente": aqui ele é "o controle automático".
 * Puro e testado: a tela só mostra.
 */
import type { Controlador, Passo } from './contrato'
import { estadoDe, FAIXAS, piorEstado, valorDe, type EstadoVariavel, type Variavel } from './faixas'

export type Grupo = { id: string; nome: string; variaveis: Variavel[]; apoio?: string }

/** A grade 2×2 do celular: o crucial. */
export const GRUPOS_CELULAR: Grupo[] = [
  { id: 'ar', nome: 'Ar', variaveis: ['temperatura', 'vpd'] },
  { id: 'ph', nome: 'pH', variaveis: ['ph'], apoio: 'acidez da água' },
  { id: 'ec', nome: 'Nutrientes', variaveis: ['ec'], apoio: 'EC, o adubo na água' },
  { id: 'agua', nome: 'Água', variaveis: ['temperaturaAgua', 'nivel'] },
]

/** Os 8 cards do desktop (umidade e VPD juntos, como no rascunho). */
export const VARIAVEIS_DESKTOP: Variavel[][] = [
  ['temperatura'],
  ['umidade', 'vpd'],
  ['co2'],
  ['luz'],
  ['ph'],
  ['ec'],
  ['temperaturaAgua'],
  ['nivel'],
]

/** Valor como aparece na tela (nível do reservatório em %). */
export const valorExibido = (variavel: Variavel, valor: number) => (variavel === 'nivel' ? valor * 100 : valor)

/** Variáveis que entram no semáforo (luz varia com o dia e não tem "fora da faixa"). */
export const VARIAVEIS_COM_ESTADO: Variavel[] = [
  'temperatura',
  'umidade',
  'vpd',
  'co2',
  'ph',
  'ec',
  'temperaturaAgua',
  'nivel',
]

export function estadoDaVariavel(passo: Passo, variavel: Variavel): EstadoVariavel {
  if (variavel === 'luz') return 'ok'
  return estadoDe(valorDe(passo.leitura, variavel), FAIXAS[variavel])
}

export function estadoDoGrupo(passo: Passo, grupo: Pick<Grupo, 'variaveis'>): EstadoVariavel {
  return piorEstado(grupo.variaveis.map((v) => estadoDaVariavel(passo, v)))
}

/**
 * Estado confirmado: só sai de "ok" se os dois últimos passos concordam.
 * Mesma histerese do alerta: a frase, as bordas e o alerta nunca se contradizem
 * quando o valor oscila na beira da faixa.
 */
export function estadoConfirmado(passos: Passo[], v: Variavel): EstadoVariavel {
  const a = passos.at(-1)
  const b = passos.at(-2)
  if (!a) return 'ok'
  const ea = estadoDaVariavel(a, v)
  if (!b) return ea
  const eb = estadoDaVariavel(b, v)
  if (ea === 'ok' || eb === 'ok') return 'ok'
  return ea === 'risco' && eb === 'risco' ? 'risco' : 'atencao'
}

export const estadoConfirmadoDoGrupo = (passos: Passo[], variaveis: Variavel[]) =>
  piorEstado(variaveis.map((v) => estadoConfirmado(passos, v)))

const NOME_DO_CONTROLE: Record<Controlador['tipo'], string> = {
  agente: 'O controle automático cuida da estufa.',
  regras: 'O termostato cuida da estufa.',
  pid: 'O termostato cuida da estufa.',
  nada: 'Nenhum controle está ligado.',
}

/** A frase grande do topo e a linha de apoio. */
export function fraseDeEstado(passos: Passo[], controlador: Controlador): { titulo: string; apoio: string } {
  const estados = VARIAVEIS_COM_ESTADO.map((v) => estadoConfirmado(passos, v))
  const atencao = estados.filter((e) => e === 'atencao').length
  const risco = estados.filter((e) => e === 'risco').length
  const quem = NOME_DO_CONTROLE[controlador.tipo]
  if (risco > 0)
    return {
      titulo: 'Algo saiu da faixa',
      apoio: `${quem} ${risco === 1 ? '1 ponto precisa' : `${risco} pontos precisam`} de cuidado agora.`,
    }
  if (atencao > 0)
    return {
      titulo: 'Quase tudo na faixa',
      apoio: `${quem} ${atencao === 1 ? '1 ponto pede' : `${atencao} pontos pedem`} atenção.`,
    }
  return { titulo: 'Tudo na faixa', apoio: quem }
}

export type Tendencia = 'subindo' | 'caindo' | 'estavel'

/** Compara agora com uma hora atrás (6 passos de 10 min). */
export function tendencia(passos: Passo[], variavel: Variavel): Tendencia {
  const agora = passos.at(-1)
  const antes = passos.at(-7)
  if (!agora || !antes) return 'estavel'
  const delta = valorDe(agora.leitura, variavel) - valorDe(antes.leitura, variavel)
  // zona morta de 8% da faixa: a seta não troca a cada leitura
  const limiar = (FAIXAS[variavel].max - FAIXAS[variavel].min) * 0.08
  return delta > limiar ? 'subindo' : delta < -limiar ? 'caindo' : 'estavel'
}

export type Alerta = { variavel: Variavel; estado: Exclude<EstadoVariavel, 'ok'>; titulo: string; feito: string }

const minutosAtras = (passos: Passo[], i: number) => (passos.length - 1 - i) * 10

/**
 * O alerta mais importante agora, em linguagem humana, e o que o controle já fez.
 * `passos` são os recentes (o último é o atual). null quando está tudo bem.
 */
export function alertaPrincipal(passos: Passo[]): Alerta | null {
  const atual = passos.at(-1)
  if (!atual) return null
  const candidatas = VARIAVEIS_COM_ESTADO.map((v) => ({ v, e: estadoDaVariavel(atual, v) })).filter((c) => c.e !== 'ok')
  const pior = candidatas.find((c) => c.e === 'risco') ?? candidatas[0]
  if (!pior) return null

  const v = pior.v
  const faixa = FAIXAS[v]
  const valor = valorDe(atual.leitura, v)
  const acima = valor > faixa.max
  const t = tendencia(passos, v)
  const numero = formatar(valorExibido(v, valor), faixa.casas)
  const unidade = v === 'nivel' || faixa.unidade === '%' ? '%' : faixa.unidade ? ` ${faixa.unidade}` : ''
  const movimento = t === 'estavel' ? '' : ` e ${t}`
  const titulo = `${faixa.nome} ${acima ? 'acima' : 'abaixo'} da faixa: ${numero}${unidade}${movimento}.`

  return { variavel: v, estado: pior.e as Alerta['estado'], titulo, feito: oQueFoiFeito(passos, v, acima) }
}

const NOME_ATUADOR = { exaustor: 'o exaustor', nebulizacao: 'a névoa', sombreamento: 'a sombra', luz: 'a luz' } as const

/**
 * O que o controle fez na última hora para corrigir a variável. Só conta o que
 * está gravado nos passos (nada de adivinhar intenção).
 */
function oQueFoiFeito(passos: Passo[], v: Variavel, acima: boolean): string {
  const janela = passos.slice(-7)
  const ultimo = (pred: (p: Passo) => boolean) => {
    for (let i = janela.length - 1; i >= 0; i--) if (pred(janela[i]!)) return i
    return -1
  }
  const ha = (i: number) => {
    const min = minutosAtras(janela, i)
    return min === 0 ? 'agora' : `há ${min} min`
  }
  const barrada = ultimo((p) => p.barradas.length > 0)
  if (barrada >= 0) {
    const b = janela[barrada]!.barradas[0]!
    return `O controle tentou agir, mas a segurança barrou ${ha(barrada)}: ${b.motivo}`
  }
  if (v === 'ph' && acima) {
    const i = ultimo((p) => p.acoes.dosagemAcido > 0)
    if (i >= 0) return `O controle dosou ${formatar(janela[i]!.acoes.dosagemAcido, 0)} ml de ácido ${ha(i)}.`
  }
  if (v === 'ec' && !acima) {
    const i = ultimo((p) => p.acoes.dosagemAB > 0)
    if (i >= 0) return `O controle dosou ${formatar(janela[i]!.acoes.dosagemAB, 0)} ml de nutriente ${ha(i)}.`
  }
  if (v === 'temperatura' || v === 'vpd' || v === 'umidade') {
    // o que estava ligado no último passo, com a força de cada um
    const agora = janela.at(-1)!.acoes
    const ligados = (Object.keys(NOME_ATUADOR) as (keyof typeof NOME_ATUADOR)[])
      .filter((k) => agora[k] > 0.05)
      .map((k) => `${NOME_ATUADOR[k]} em ${formatar(agora[k] * 100, 0)}%`)
    return ligados.length ? `Ligados agora: ${ligados.join(', ')}.` : 'Nenhum equipamento ligado agora.'
  }
  if (v === 'nivel' && !acima) {
    const i = ultimo((p) => p.acoes.reposicaoAgua)
    if (i >= 0) return `O controle começou a repor água ${ha(i)}.`
  }
  return 'Nenhuma ação sobre isso na última hora.'
}

function formatar(valor: number, casas: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}
