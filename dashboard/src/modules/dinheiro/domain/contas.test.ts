import type { ResumoCiclo } from '@/modules/estufa/dominio'
import { contaDoCiclo, fatorPeso, formatarReais, formatarReaisCurto } from './contas'
import type { Precos } from './contrato'
import { lancamentosParaCsv, totaisDosLancamentos, type Lancamento } from './lancamentos'

const precos: Precos = {
  alfacePorPe: 2,
  tarifaKwh: 0.85,
  aguaPorM3: 8,
  mudaPorUnidade: 0.15,
  aduboPorCiclo: 50,
  embalagemPorPe: 0.1,
  outrosPorCiclo: 180,
}
const resumo: ResumoCiclo = {
  estufaId: 'e',
  massaPorPe: 242,
  energiaKwh: 400,
  aguaL: 2000,
  nutrienteG: 0,
  acidoMl: 0,
  foraDaFaixa: 0.5,
  foraPorVariavel: {},
  barradas: 0,
}

describe('fatorPeso', () => {
  it('220 g vale o preço cheio; 242 g, 10% a mais (o teto); abaixo de 120 g, nada', () => {
    expect(fatorPeso(220)).toBe(1)
    expect(fatorPeso(242)).toBeCloseTo(1.1)
    expect(fatorPeso(400)).toBe(1.1)
    expect(fatorPeso(119)).toBe(0)
  })
})

describe('contaDoCiclo', () => {
  const c = contaDoCiclo(resumo, 1000, precos)

  it('de cima para baixo: pés × preço do pé = venda', () => {
    expect(c.precoDoPe).toBeCloseTo(2.2)
    expect(c.venda).toBeCloseTo(2200)
  })

  it('cada gasto na sua linha, com a conta da planilha', () => {
    expect(c.gastos.energia).toBeCloseTo(340) // 400 kWh × 0,85
    expect(c.gastos.agua).toBeCloseTo(16) // 2 m³ × 8
    expect(c.gastos.adubo).toBe(50)
    expect(c.gastos.mudas).toBeCloseTo(150) // 1000 × 0,15
    expect(c.gastos.embalagem).toBeCloseTo(100) // 1000 × 0,10
    expect(c.gastos.outros).toBe(180)
    expect(c.totalGastos).toBeCloseTo(836)
    expect(c.sobra).toBeCloseTo(1364)
  })

  it('ponto de equilíbrio: o preço do pé de 220 g que zera a sobra', () => {
    expect(c.precoMinimoPorPe).toBeCloseTo(836 / (1000 * 1.1))
    const noLimite = contaDoCiclo(resumo, 1000, { ...precos, alfacePorPe: c.precoMinimoPorPe })
    expect(noLimite.sobra).toBeCloseTo(0)
  })

  it('alface que não vende (abaixo de 120 g): sem ponto de equilíbrio', () => {
    expect(contaDoCiclo({ ...resumo, massaPorPe: 8 }, 1000, precos).precoMinimoPorPe).toBe(Infinity)
  })
})

describe('lançamentos', () => {
  const lancamentos: Lancamento[] = [
    { id: '1', data: '2026-11-20', categoria: 'venda', descricao: 'feira; "sábado"', valor: 300 },
    { id: '2', data: '2026-11-10', categoria: 'energia', descricao: 'conta de luz', valor: 120.5 },
    { id: '3', data: '2026-11-12', categoria: 'mudas', descricao: '', valor: 80 },
  ]

  it('somam por categoria, e a sobra é vendas menos gastos', () => {
    const t = totaisDosLancamentos(lancamentos)
    expect(t.venda).toBe(300)
    expect(t.energia).toBe(120.5)
    expect(t.gastos).toBe(200.5)
    expect(t.sobra).toBe(99.5)
  })

  it('CSV em ordem de data, com vírgula decimal e aspas escapadas', () => {
    expect(lancamentosParaCsv(lancamentos).split('\n')).toEqual([
      'data;tipo;categoria;descricao;valor_reais',
      '2026-11-10;saída;"Energia";"conta de luz";120,50',
      '2026-11-12;saída;"Mudas";"";80,00',
      '2026-11-20;entrada;"Venda de alface";"feira; ""sábado""";300,00',
    ])
  })
})

describe('formatar', () => {
  it('reais com e sem centavos', () => {
    expect(formatarReais(1234.5)).toMatch(/^R\$\s1\.234,50$/)
    expect(formatarReaisCurto(1234.5)).toMatch(/^R\$\s1\.235$/)
  })
})
