import { rotaAtiva } from './tipos'

describe('rotaAtiva', () => {
  it('a raiz só casa com ela mesma', () => {
    expect(rotaAtiva('/', '/')).toBe(true)
    expect(rotaAtiva('/', '/ciclo')).toBe(false)
  })

  it('/dev não fica acesa nas subpáginas do desenvolvedor', () => {
    expect(rotaAtiva('/dev', '/dev')).toBe(true)
    expect(rotaAtiva('/dev', '/dev/treino')).toBe(false)
  })

  it('as outras casam com subrotas, mas não com prefixo parecido', () => {
    expect(rotaAtiva('/dev/treino', '/dev/treino/g812')).toBe(true)
    expect(rotaAtiva('/ciclo', '/ciclos')).toBe(false)
  })
})
