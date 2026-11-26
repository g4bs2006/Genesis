/**
 * De uma lista de passos para as séries e trilhas do GraficoSerie, por aba.
 * Cada aba pode ter mais de um gráfico (pH e EC têm escalas diferentes).
 */
import { FAIXAS, valorDe, valorExibido, type Passo, type Variavel } from '@/modules/estufa'
import type { MarcaAcao, Serie, TrilhaAcao } from '@/shared/design-system/graficos/GraficoSerie'
import { formatarNumero } from '@/shared/lib/formatar'

export type Painel = {
  titulo: string
  variavel: Variavel
  series: Serie[]
  faixa: [number, number]
  acoes: TrilhaAcao[]
  marcas: MarcaAcao[]
  formatarValor: (v: number) => string
}

export type Aba = { id: string; nome: string; paineis: Painel[] }

const t = (p: Passo) => new Date(p.leitura.instante).getTime()
const serieDe = (passos: Passo[], v: Variavel, nome: string, cor: string): Serie => ({
  nome,
  cor,
  pontos: passos.map((p) => ({ t: t(p), v: valorExibido(v, valorDe(p.leitura, v)) })),
})
const acao = (
  passos: Passo[],
  nome: string,
  tipo: TrilhaAcao['tipo'],
  cor: string,
  ler: (p: Passo) => number,
): TrilhaAcao => ({
  nome,
  tipo,
  cor,
  pontos: passos.map((p) => ({ t: t(p), v: ler(p) })),
})
export const faixa = (v: Variavel): [number, number] => [valorExibido(v, FAIXAS[v].min), valorExibido(v, FAIXAS[v].max)]
export const formato = (v: Variavel) => {
  const f = FAIXAS[v]
  const unidade = v === 'nivel' ? '%' : f.unidade ? ` ${f.unidade}` : ''
  return (x: number) => `${formatarNumero(x, f.casas)}${unidade}`
}

type Ligavel = 'exaustor' | 'nebulizacao' | 'sombreamento' | 'luz'
const EQUIPAMENTO: Record<Ligavel, { nome: string; cor: string }> = {
  exaustor: { nome: 'exaustor', cor: 'var(--serie-azul)' },
  nebulizacao: { nome: 'névoa', cor: 'var(--serie-menta)' },
  sombreamento: { nome: 'sombra', cor: 'var(--serie-cinza)' },
  luz: { nome: 'luz extra', cor: 'var(--serie-amarelo)' },
}
/** acima disto o equipamento "ligou"; abaixo daquilo, "desligou" (a folga evita marcar ruído) */
const LIGA = 0.1
const DESLIGA = 0.05

/**
 * Quando cada equipamento ligou e desligou. A rede decide de 0 a 1, então
 * "ligar" é passar de 10% e "desligar" é cair abaixo de 5%. Nas gravações dos
 * campeões isso dá ~2 trocas por dia por equipamento; nas regras fixas, dezenas.
 */
export function ligaDesliga(passos: Passo[], equipamentos: Ligavel[]): MarcaAcao[] {
  const marcas: MarcaAcao[] = []
  for (const k of equipamentos) {
    let ligado = (passos[0]?.acoes[k] ?? 0) > LIGA
    for (const p of passos.slice(1)) {
      const v = p.acoes[k]
      if (!ligado && v > LIGA) ligado = true
      else if (ligado && v < DESLIGA) ligado = false
      else continue
      marcas.push({ t: t(p), nome: EQUIPAMENTO[k].nome, cor: EQUIPAMENTO[k].cor, liga: ligado })
    }
  }
  return marcas.sort((a, b) => a.t - b.t)
}

function painel(
  passos: Passo[],
  v: Variavel,
  titulo: string,
  acoes: TrilhaAcao[],
  extra: Serie[] = [],
  ligaveis: Ligavel[] = [],
): Painel {
  return {
    titulo,
    variavel: v,
    series: [serieDe(passos, v, 'dentro', 'var(--serie-azul)'), ...extra],
    faixa: faixa(v),
    acoes,
    marcas: ligaDesliga(passos, ligaveis),
    formatarValor: formato(v),
  }
}

export function abasDoHistorico(passos: Passo[]): Aba[] {
  const fora: Serie = {
    nome: 'fora',
    cor: 'var(--serie-cinza)',
    tracejada: true,
    pontos: passos.map((p) => ({ t: t(p), v: p.leitura.fora.temperatura })),
  }
  return [
    {
      id: 'temperatura',
      nome: 'Temperatura',
      paineis: [
        painel(
          passos,
          'temperatura',
          'Temperatura do ar',
          [
            acao(passos, 'exaustor', 'intensidade', 'var(--serie-azul)', (p) => p.acoes.exaustor),
            acao(passos, 'névoa', 'intensidade', 'var(--serie-menta)', (p) => p.acoes.nebulizacao),
            acao(passos, 'sombra', 'intensidade', 'var(--serie-cinza)', (p) => p.acoes.sombreamento),
          ],
          [fora],
          ['exaustor', 'nebulizacao', 'sombreamento'],
        ),
      ],
    },
    {
      id: 'ph-ec',
      nome: 'pH e EC',
      paineis: [
        painel(passos, 'ph', 'pH da solução', [
          acao(passos, 'ácido (ml)', 'pontos', 'var(--serie-roxo)', (p) => p.acoes.dosagemAcido),
        ]),
        painel(passos, 'ec', 'EC (nutrientes)', [
          acao(passos, 'nutriente (ml)', 'pontos', 'var(--serie-verde)', (p) => p.acoes.dosagemAB),
        ]),
      ],
    },
    {
      id: 'agua',
      nome: 'Água',
      paineis: [
        painel(passos, 'temperaturaAgua', 'Temperatura da água', [
          acao(passos, 'bomba', 'intensidade', 'var(--serie-azul)', (p) => (p.acoes.bomba ? 1 : 0)),
        ]),
        painel(passos, 'nivel', 'Nível do reservatório', [
          acao(passos, 'reposição', 'intensidade', 'var(--serie-menta)', (p) => (p.acoes.reposicaoAgua ? 1 : 0)),
        ]),
      ],
    },
    {
      id: 'luz-co2',
      nome: 'Luz e CO₂',
      paineis: [
        painel(
          passos,
          'luz',
          'Luz na planta',
          [
            acao(passos, 'luz extra', 'intensidade', 'var(--serie-amarelo)', (p) => p.acoes.luz),
            acao(passos, 'sombra', 'intensidade', 'var(--serie-cinza)', (p) => p.acoes.sombreamento),
          ],
          [],
          ['luz', 'sombreamento'],
        ),
        painel(
          passos,
          'co2',
          'CO₂ no ar',
          [acao(passos, 'exaustor', 'intensidade', 'var(--serie-azul)', (p) => p.acoes.exaustor)],
          [],
          ['exaustor'],
        ),
      ],
    },
  ]
}

/** Exporta os passos como CSV (abre no Excel/Planilhas). Vírgula decimal e ponto e vírgula. */
export function passosParaCsv(passos: Passo[]): string {
  const cab = [
    'instante',
    'temperatura_ar',
    'umidade',
    'vpd',
    'co2',
    'luz',
    'ph',
    'ec',
    'temperatura_agua',
    'nivel',
    'temperatura_fora',
    'tarifa_kwh',
    'exaustor',
    'nebulizacao',
    'sombreamento',
    'luz_extra',
    'dose_ab_ml',
    'dose_acido_ml',
    'reposicao',
    'bomba',
    'barradas',
  ]
  const n = (x: number) => String(x).replace('.', ',')
  const linhas = passos.map((p) => {
    const { ar, solucao, fora, tarifaKwh, instante } = p.leitura
    const a = p.acoes
    return [
      instante,
      n(ar.temperatura),
      n(ar.umidade),
      n(ar.vpd),
      n(ar.co2),
      n(ar.luz),
      n(solucao.ph),
      n(solucao.ec),
      n(solucao.temperaturaAgua),
      n(solucao.nivel),
      n(fora.temperatura),
      n(tarifaKwh),
      n(a.exaustor),
      n(a.nebulizacao),
      n(a.sombreamento),
      n(a.luz),
      n(a.dosagemAB),
      n(a.dosagemAcido),
      a.reposicaoAgua ? 1 : 0,
      a.bomba ? 1 : 0,
      p.barradas.length,
    ].join(';')
  })
  return [cab.join(';'), ...linhas].join('\n')
}
