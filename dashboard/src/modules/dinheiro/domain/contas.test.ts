import type { ResumoCiclo } from '@/modules/estufa/dominio'
import {
  barraDeCustos,
  custosDoCiclo,
  fatorPeso,
  formatarReais,
  formatarReaisCurto,
  pontoDeEquilibrio,
  projecao,
  receitaDoCiclo,
  resultadoDoCiclo,
  vantagemDoAgente,
} from './contas'
import type { Precos } from './contrato'

// Exemplo pequeno com números redondos, para conferir de cabeça.
const precos: Precos = {
  alfacePorPe: { baixo: 1, medio: 2, alto: 3 },
  tarifaKwh: 0.8,
  nutrientePorKg: 20,
  acidoPorL: 30,
  aguaPorM3: 5,
  mudaPorUnidade: 0.1,
  fixosPorCiclo: 50,
}

const resumo: ResumoCiclo = {
  estufaId: 'a',
  massaPorPe: 220,
  energiaKwh: 100, // 100 × 0,80 = 80
  aguaL: 2000, // 2 m³ × 5 = 10
  nutrienteG: 500, // 0,5 kg × 20 = 10
  acidoMl: 200, // 0,2 L × 30 = 6
  foraDaFaixa: 0,
  foraPorVariavel: {},
  barradas: 0,
}

const plantas = 100 // mudas: 100 × 0,10 = 10

/** Mesmo consumo por planta, outro número de plantas (para testar o equilíbrio). */
function escalar(r: ResumoCiclo, fator: number): ResumoCiclo {
  return {
    ...r,
    energiaKwh: r.energiaKwh * fator,
    aguaL: r.aguaL * fator,
    nutrienteG: r.nutrienteG * fator,
    acidoMl: r.acidoMl * fator,
  }
}

const semEspacoEspecial = (s: string) => s.replace(/\s/g, ' ')

describe('custosDoCiclo', () => {
  it('converte consumo em R$ item por item', () => {
    const c = custosDoCiclo(resumo, plantas, precos)
    expect(c.energia).toBeCloseTo(80)
    expect(c.nutrientes).toBeCloseTo(10)
    expect(c.acido).toBeCloseTo(6)
    expect(c.agua).toBeCloseTo(10)
    expect(c.mudas).toBeCloseTo(10)
    expect(c.fixos).toBe(50)
    expect(c.total).toBeCloseTo(166)
  })
})

describe('fatorPeso', () => {
  it('abaixo de 120 g não vende; 220 g é o preço cheio; teto de 1,1', () => {
    expect(fatorPeso(119)).toBe(0)
    expect(fatorPeso(120)).toBeCloseTo(120 / 220)
    expect(fatorPeso(220)).toBe(1)
    expect(fatorPeso(300)).toBe(1.1)
  })
})

describe('receitaDoCiclo', () => {
  it('plantas × preço do cenário × fator de peso', () => {
    expect(receitaDoCiclo(220, 100, precos, 'medio')).toBeCloseTo(200)
    expect(receitaDoCiclo(110, 100, precos, 'medio')).toBe(0)
    expect(receitaDoCiclo(300, 100, precos, 'alto')).toBeCloseTo(330)
  })
})

describe('resultadoDoCiclo', () => {
  it('lucro e margem do exemplo', () => {
    const r = resultadoDoCiclo(resumo, plantas, precos, 'medio')
    expect(r.receita).toBeCloseTo(200)
    expect(r.lucro).toBeCloseTo(34)
    expect(r.margem).toBeCloseTo(0.17)
  })

  it('lucro = receita − custos em todo cenário', () => {
    for (const cenario of ['baixo', 'medio', 'alto'] as const) {
      const r = resultadoDoCiclo(resumo, plantas, precos, cenario)
      expect(r.lucro).toBeCloseTo(r.receita - r.custos.total)
    }
  })

  it('sem receita a margem é 0, não NaN', () => {
    const r = resultadoDoCiclo({ ...resumo, massaPorPe: 50 }, plantas, precos, 'medio')
    expect(r.receita).toBe(0)
    expect(r.margem).toBe(0)
    expect(r.lucro).toBeCloseTo(-166)
  })
})

describe('projecao', () => {
  it('estica o lucro do ciclo para 30 e 365 dias', () => {
    expect(projecao(100, 35)).toEqual({
      ciclo: 100,
      mes: expect.closeTo((100 * 30) / 35, 10) as number,
      ano: expect.closeTo((100 * 365) / 35, 10) as number,
    })
    const p = projecao(60, 30)
    expect(p.mes).toBeCloseTo(60)
    expect(p.ano).toBeCloseTo(730)
  })
})

describe('pontoDeEquilibrio', () => {
  it('números do exemplo', () => {
    const e = pontoDeEquilibrio(resumo, plantas, precos, 'medio')
    expect(e.precoMinimoPorPe).toBeCloseTo(1.66) // 166 / 100
    expect(e.plantasMinimas).toBeCloseTo(50 / 0.84) // fixos / (2 − 1,16)
  })

  it('com o preço mínimo, o lucro é zero', () => {
    const { precoMinimoPorPe } = pontoDeEquilibrio(resumo, plantas, precos, 'medio')
    const p = { ...precos, alfacePorPe: { ...precos.alfacePorPe, medio: precoMinimoPorPe } }
    expect(resultadoDoCiclo(resumo, plantas, p, 'medio').lucro).toBeCloseTo(0)
  })

  it('com as plantas mínimas (consumo proporcional), o lucro é zero', () => {
    const { plantasMinimas } = pontoDeEquilibrio(resumo, plantas, precos, 'medio')
    const r = escalar(resumo, plantasMinimas / plantas)
    expect(resultadoDoCiclo(r, plantasMinimas, precos, 'medio').lucro).toBeCloseTo(0)
  })

  it('se cada planta dá prejuízo, não há equilíbrio', () => {
    expect(pontoDeEquilibrio(resumo, plantas, precos, 'baixo').plantasMinimas).toBe(Infinity)
    expect(pontoDeEquilibrio({ ...resumo, massaPorPe: 50 }, plantas, precos, 'medio')).toEqual({
      precoMinimoPorPe: Infinity,
      plantasMinimas: Infinity,
    })
  })
})

describe('vantagemDoAgente', () => {
  it('positiva quando o agente gasta menos, negativa no contrário', () => {
    const regras = resumo
    const agente = { ...resumo, energiaKwh: 80 } // 20 kWh × 0,80 = R$ 16 a menos
    expect(vantagemDoAgente(agente, regras, plantas, precos, 'medio')).toBeCloseTo(16)
    expect(vantagemDoAgente(regras, agente, plantas, precos, 'medio')).toBeCloseTo(-16)
  })

  it('pé mais pesado também conta como vantagem', () => {
    const agente = { ...resumo, massaPorPe: 242 } // fator 1,1: +R$ 20
    expect(vantagemDoAgente(agente, resumo, plantas, precos, 'medio')).toBeCloseTo(20)
  })
})

describe('barraDeCustos', () => {
  it('custos em ordem e lucro por último; a soma dá a receita', () => {
    const r = resultadoDoCiclo(resumo, plantas, precos, 'medio')
    const barra = barraDeCustos(r)
    expect(barra.map((f) => f.chave)).toEqual(['energia', 'nutrientes', 'acido', 'agua', 'mudas', 'fixos', 'lucro'])
    expect(barra.map((f) => f.rotulo)).toEqual(['Energia', 'Nutrientes', 'Ácido', 'Água', 'Mudas', 'Fixos', 'Lucro'])
    expect(barra.reduce((s, f) => s + f.valor, 0)).toBeCloseTo(r.receita)
    expect(barra.at(-1)?.prejuizo).toBeUndefined()
  })

  it('prejuízo vira lucro 0 com o campo prejuizo', () => {
    const r = resultadoDoCiclo(resumo, plantas, precos, 'baixo') // 100 − 166
    expect(barraDeCustos(r).at(-1)).toEqual({ chave: 'lucro', rotulo: 'Lucro', valor: 0, prejuizo: expect.closeTo(66) })
  })
})

describe('formatadores', () => {
  it('formatarReais usa o padrão brasileiro com centavos', () => {
    expect(semEspacoEspecial(formatarReais(1234.56))).toBe('R$ 1.234,56')
    expect(semEspacoEspecial(formatarReais(0))).toBe('R$ 0,00')
  })

  it('formatarReaisCurto arredonda e tira os centavos', () => {
    expect(semEspacoEspecial(formatarReaisCurto(1234.56))).toBe('R$ 1.235')
    expect(semEspacoEspecial(formatarReaisCurto(1234567))).toBe('R$ 1.234.567')
  })
})
