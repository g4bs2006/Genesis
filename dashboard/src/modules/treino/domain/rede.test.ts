import type { Passo } from '@/modules/estufa/dominio'
import { ENTRADAS, SAIDAS, atribuicao, normalizarEntradas, propagar } from './rede'

// pesos de mentira, mas determinísticos (sem Math.random: o teste sempre dá igual)
const pesosFalsos = (arq: number[]) => {
  const n = arq.slice(1).reduce((soma, saidas, i) => soma + arq[i]! * saidas + saidas, 0)
  return Array.from({ length: n }, (_, i) => Math.sin(i * 12.9898) * 0.8)
}
const modelo = (arquitetura: number[]) => ({ arquitetura, pesos: pesosFalsos(arquitetura) })

function passo(instante: string, temperatura: number): Passo {
  return {
    leitura: {
      estufaId: 'e',
      instante,
      ar: { temperatura, umidade: 70, vpd: 0.9, co2: 600, luz: 300 },
      solucao: { ph: 6, ec: 1.5, temperaturaAgua: 21, nivel: 0.8 },
      fora: { temperatura: 25, umidade: 60, radiacao: 400 },
      tarifaKwh: 0.9,
    },
    acoes: {
      exaustor: 0,
      nebulizacao: 0,
      sombreamento: 0,
      luz: 0,
      dosagemAB: 0,
      dosagemAcido: 0,
      reposicaoAgua: false,
      bomba: true,
    },
    barradas: [],
  }
}

describe('rede', () => {
  it('tem 20 entradas e 8 saídas', () => {
    expect(ENTRADAS).toHaveLength(20)
    expect(SAIDAS).toHaveLength(8)
  })

  it('normaliza a partir do passo atual e do de uma hora antes', () => {
    const x = normalizarEntradas([
      passo('2026-11-23T11:00:00-03:00', 22),
      passo('2026-11-23T11:30:00-03:00', 23),
      passo('2026-11-23T12:00:00-03:00', 25),
    ])
    expect(x).toHaveLength(20)
    for (const v of x) expect(Math.abs(v)).toBeLessThanOrEqual(2)
    expect(x[0]).toBeCloseTo(0.3) // (25 - 22) / 10
    expect(x[12]).toBeCloseTo(0) // seno do meio-dia
    expect(x[13]).toBeCloseTo(-1) // cosseno do meio-dia
    expect(x[14]).toBe(0) // dia do ciclo desconhecido
    expect(x[16]).toBeCloseTo(1) // subiu 3 °C na hora
    expect(normalizarEntradas([])).toEqual(Array(20).fill(0))
  })

  it.each([[[20, 32, 32, 8]], [[6, 16, 2]]])('propaga a arquitetura %j com o formato certo', (arq) => {
    const m = modelo(arq)
    const entradas = Array.from({ length: arq[0]! }, (_, i) => (i % 3) - 1)
    const a = propagar(m, entradas)
    expect(a.map((c) => c.length)).toEqual(arq)
    // camadas do meio em -1..1 (tanh), saída em 0..1 (sigmoide)
    for (const c of a.slice(1, -1)) for (const v of c) expect(Math.abs(v)).toBeLessThanOrEqual(1)
    for (const v of a.at(-1)!) expect(v > 0 && v < 1).toBe(true)
    expect(propagar(m, entradas)).toEqual(a)
    expect(atribuicao(m, entradas, 0)).toHaveLength(arq[0]!)
  })

  it('atribuição: entrada já zerada não pesa nada', () => {
    const m = modelo([6, 16, 2])
    const r = atribuicao(m, [0, 0.5, -1, 1, 0.3, 0], 1)
    expect(r[0]).toBe(0)
    expect(r[5]).toBe(0)
    expect(r.some((v) => v !== 0)).toBe(true)
  })

  it('reclama de pesos ou entradas no tamanho errado', () => {
    const m = modelo([6, 16, 2])
    expect(() => propagar({ ...m, pesos: m.pesos.slice(1) }, [0, 0, 0, 0, 0, 0])).toThrow(/pede/)
    expect(() => propagar(m, [0, 0])).toThrow(/espera 6/)
  })
})
