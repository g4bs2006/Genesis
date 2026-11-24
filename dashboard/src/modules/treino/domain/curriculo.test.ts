import { provas, situacaoDasFases } from './curriculo'

describe('situacaoDasFases', () => {
  const estado = { faseAtual: 4 as const, geracaoAtual: 812, inicioPorFase: { '1': 1, '2': 141, '3': 361, '4': 541 } }

  it('feitas com o intervalo, a atual até a geração de agora, as futuras sem intervalo', () => {
    const s = situacaoDasFases(estado)
    expect(s[0]).toMatchObject({ situacao: 'feita', inicio: 1, fim: 140 })
    expect(s[2]).toMatchObject({ situacao: 'feita', inicio: 361, fim: 540 })
    expect(s[3]).toMatchObject({ situacao: 'atual', inicio: 541, fim: 812 })
    expect(s[4]).toMatchObject({ situacao: 'futura', inicio: undefined, fim: undefined })
  })
})

describe('provas', () => {
  it('abaixo de 90% esqueceu, com a sugestão de misturar mais cenários', () => {
    const p = provas({ fase: 4, provaPorFase: { '1': 0.95, '2': 0.86, '3': 0.92, '4': 0.88 } })
    // a fase 4 (a de agora) com 88% está sendo aprendida, não esquecida
    expect(p.map((x) => x.esqueceu)).toEqual([false, true, false, false])
    expect(p[3]!.aprendendo).toBe(true)
    expect(p[1]!.sugestao).toMatch(/mistura de cenários da fase 2/)
  })
})
