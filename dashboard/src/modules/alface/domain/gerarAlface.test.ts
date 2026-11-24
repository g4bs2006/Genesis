import { gerarAlface, type ParametrosAlface } from './gerarAlface'

const saudavel: ParametrosAlface = { massa: 182, turgor: 1, clorose: 0, necrose: 0 }

describe('gerarAlface', () => {
  it('é determinística: mesma entrada e semente, mesma alface', () => {
    expect(gerarAlface(saudavel, 7)).toEqual(gerarAlface(saudavel, 7))
  })

  it('sementes diferentes dão plantas diferentes', () => {
    expect(gerarAlface(saudavel, 1).folhas[0]!.contorno).not.toBe(gerarAlface(saudavel, 2).folhas[0]!.contorno)
  })

  it('mais massa, mais folhas', () => {
    const muda = gerarAlface({ ...saudavel, massa: 20 }, 1)
    const colheita = gerarAlface({ ...saudavel, massa: 245 }, 1)
    expect(colheita.folhas.length).toBeGreaterThan(muda.folhas.length)
  })

  it('crescer não embaralha as folhas que já existiam', () => {
    // a folha 0 (a mais velha) mantém a direção quando nascem folhas novas
    const antes = gerarAlface({ ...saudavel, massa: 120 }, 3)
    const depois = gerarAlface({ ...saudavel, massa: 121 }, 3)
    const a = antes.folhas.find((f) => f.indice === 0)!
    const b = depois.folhas.find((f) => f.indice === 0)!
    expect(a.gradiente.ate.x).toBeCloseTo(b.gradiente.ate.x, 0)
  })

  it('sem número quebrado nos caminhos', () => {
    for (const massa of [0, 5, 60, 182, 300]) {
      const d = gerarAlface({ massa, turgor: 0, clorose: 1, necrose: 1 }, 9)
      for (const f of d.folhas) expect(f.contorno).not.toMatch(/NaN|Infinity/)
    }
  })

  it('clorose amarela primeiro as folhas de fora (velhas)', () => {
    const d = gerarAlface({ ...saudavel, clorose: 0.4 }, 1)
    const velha = d.folhas.find((f) => f.indice === 0)!
    const nova = d.folhas.find((f) => f.indice === d.folhas.length - 1)!
    const matiz = (cor: string) => Number(cor.match(/hsl\(([\d.]+)/)![1])
    // matiz menor = mais amarelo (verde ~100, amarelo ~52)
    expect(matiz(velha.gradiente.ponta)).toBeLessThan(matiz(nova.gradiente.ponta) + 1)
    expect(matiz(velha.gradiente.ponta)).toBeLessThan(
      matiz(gerarAlface(saudavel, 1).folhas.find((f) => f.indice === 0)!.gradiente.ponta),
    )
  })

  it('necrose só aparece quando pedida', () => {
    expect(gerarAlface(saudavel, 1).folhas.every((f) => f.necrose === 0)).toBe(true)
    expect(gerarAlface({ ...saudavel, necrose: 0.8 }, 1).folhas.some((f) => f.necrose > 0)).toBe(true)
  })

  it('raízes só com a planta já crescida', () => {
    expect(gerarAlface({ ...saudavel, massa: 10 }, 1).janela).toBeNull()
    expect(gerarAlface(saudavel, 1).raizes.length).toBeGreaterThan(0)
  })
})
