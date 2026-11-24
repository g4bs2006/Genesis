import {
  CAMPEAO,
  mediaEmClimas,
  NP,
  novaGeracao,
  pesosAleatorios,
  PROVA,
  criarRng,
  simular,
  sortearClima,
} from './nucleo'

describe('núcleo da estufa de brinquedo', () => {
  it('mesma semente dá o mesmo clima e a mesma nota', () => {
    const a = sortearClima(42)
    const b = sortearClima(42)
    expect(Array.from(a.tExt)).toEqual(Array.from(b.tExt))
    expect(Array.from(a.sol)).toEqual(Array.from(b.sol))
    expect(simular('rede', CAMPEAO, 1, a)[0]).toBe(simular('rede', CAMPEAO, 1, b)[0])
    // semente diferente, clima diferente
    expect(sortearClima(43).tExt[0]).not.toBe(a.tExt[0])
  })

  it('o campeão embutido ganha das regras fixas nos 20 climas da prova', () => {
    const campeao = mediaEmClimas('rede', CAMPEAO, 1, PROVA)[0]!
    const regras = mediaEmClimas('regras', null, 1, PROVA)[0]!
    const nada = mediaEmClimas('nada', null, 1, PROVA)[0]!
    console.log(
      `prova (média de 20 climas): campeão ${campeao.toFixed(1)}, regras ${regras.toFixed(1)}, nada ${nada.toFixed(1)}`,
    )
    expect(campeao).toBeGreaterThan(regras)
    expect(regras).toBeGreaterThan(nada)
  })

  it('algumas gerações de evolução melhoram a melhor nota', () => {
    // Climas fixos no treino: com elitismo, a melhor nota nunca piora; aqui
    // conferimos que ela de fato sobe.
    const treino = [500, 501, 502]
    const n = 40
    const rng = criarRng(1)
    let W = pesosAleatorios(n, rng)
    let notas = mediaEmClimas('rede', W, n, treino)
    const inicial = Math.max(...notas)
    for (let g = 0; g < 15; g++) {
      W = novaGeracao(W, notas, n, 4, 0.1, rng)
      notas = mediaEmClimas('rede', W, n, treino)
    }
    const final = Math.max(...notas)
    expect(W.length).toBe(n * NP)
    expect(final).toBeGreaterThan(inicial)
  })
})
