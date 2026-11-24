import type { Leitura } from '@/modules/estufa/dominio'
import { aparenciaDaPlanta, descreverPlanta } from './estadoDaPlanta'

const boa: Leitura = {
  estufaId: 'e',
  instante: '2026-11-23T14:30:00-03:00',
  ar: { temperatura: 23, umidade: 70, vpd: 0.9, co2: 600, luz: 400 },
  solucao: { ph: 6, ec: 1.5, temperaturaAgua: 21, nivel: 0.7 },
  fora: { temperatura: 28, umidade: 55, radiacao: 600 },
  tarifaKwh: 0.85,
}

describe('aparenciaDaPlanta', () => {
  it('tudo na faixa: saudável', () => {
    expect(aparenciaDaPlanta(boa, 182)).toEqual({ massa: 182, turgor: 1, clorose: 0, necrose: 0 })
    expect(descreverPlanta(aparenciaDaPlanta(boa, 182))).toBe('Alface de 182 g, saudável')
  })

  it('calor e ar seco murcham', () => {
    const p = aparenciaDaPlanta({ ...boa, ar: { ...boa.ar, temperatura: 31, vpd: 2 } }, 182)
    expect(p.turgor).toBeLessThan(0.5)
  })

  it('EC baixa amarela; pH fora queima', () => {
    expect(aparenciaDaPlanta({ ...boa, solucao: { ...boa.solucao, ec: 0.8 } }, 182).clorose).toBeGreaterThan(0.5)
    expect(aparenciaDaPlanta({ ...boa, solucao: { ...boa.solucao, ph: 7.2 } }, 182).necrose).toBeGreaterThan(0.5)
  })
})
