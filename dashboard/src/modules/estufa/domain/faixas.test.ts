import { estadoDe, FAIXAS, piorEstado } from './faixas'

describe('estadoDe', () => {
  const ph = FAIXAS.ph // 5,5 a 6,5: margem de atenção 0,15

  it('dentro da faixa, inclusive nas bordas, é ok', () => {
    expect(estadoDe(5.5, ph)).toBe('ok')
    expect(estadoDe(6.0, ph)).toBe('ok')
    expect(estadoDe(6.5, ph)).toBe('ok')
  })

  it('um pouco fora é atenção; muito fora é risco', () => {
    expect(estadoDe(6.6, ph)).toBe('atencao')
    expect(estadoDe(5.4, ph)).toBe('atencao')
    expect(estadoDe(6.7, ph)).toBe('risco')
    expect(estadoDe(5.0, ph)).toBe('risco')
  })
})

describe('piorEstado', () => {
  it('risco vence atenção, que vence ok', () => {
    expect(piorEstado(['ok', 'atencao', 'ok'])).toBe('atencao')
    expect(piorEstado(['atencao', 'risco'])).toBe('risco')
    expect(piorEstado([])).toBe('ok')
  })
})
