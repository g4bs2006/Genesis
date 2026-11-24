import { Gravacao } from '../../domain/contrato'
import { DadosTreinoExemplo, criarFonteGravacoesExemplo, criarFonteTreinoExemplo } from './fonteTreinoExemplo'
import arquivo from './treino.json'

const dados = DadosTreinoExemplo.parse(arquivo)
/** Pesos de uma MLP: entrada×saída mais um viés por saída, camada a camada. */
const totalPesos = (arq: number[]) => arq.slice(1).reduce((soma, saida, i) => soma + arq[i]! * saida + saida, 0)

describe('treino.json (dados de exemplo)', () => {
  it('passa no contrato (Zod)', () => {
    expect(DadosTreinoExemplo.safeParse(arquivo).success).toBe(true)
  })

  it('812 gerações, numeradas em ordem, com a fase nunca voltando atrás', () => {
    const { geracoes, estado } = dados
    expect(geracoes).toHaveLength(812)
    expect(geracoes.at(-1)).toMatchObject({ numero: 812, fase: 4 })
    geracoes.forEach((g, i) => {
      expect(g.numero).toBe(i + 1)
      if (i > 0) expect(g.fase).toBeGreaterThanOrEqual(geracoes[i - 1]!.fase)
    })
    expect(estado).toMatchObject({ rodando: true, faseAtual: 4, geracaoAtual: 812 })
    // inicioPorFase bate com a primeira geração de cada fase
    for (const [fase, inicio] of Object.entries(estado.inicioPorFase))
      expect(geracoes.find((g) => g.fase === Number(fase))!.numero).toBe(inicio)
  })

  it('cada campeão tem tantos pesos quanto a arquitetura pede', () => {
    expect(dados.modelos.map((m) => m.id)).toEqual(['g140', 'g360', 'g540', 'g812'])
    for (const m of dados.modelos) expect(m.pesos).toHaveLength(totalPesos(m.arquitetura))
    expect(totalPesos([20, 32, 32, 8])).toBe(1992)
  })

  it('o g812 esqueceu um pouco da fase 2 (dispara o alerta de < 90%)', () => {
    expect(dados.modelos.at(-1)!.provaPorFase['2']).toBeLessThan(0.9)
  })
})

describe('gravações de exemplo', () => {
  it('lista 3 gravações e cada uma carrega um ciclo de 840 passos (35 dias × 24 h) que passa no contrato', async () => {
    const fonte = criarFonteGravacoesExemplo()
    const lista = await fonte.listar()
    expect(lista.map((g) => g.modeloId)).toEqual(['g140', 'g540', 'g812'])
    for (const resumo of lista) {
      const gravacao = await fonte.obter(resumo.id)
      expect(Gravacao.safeParse(gravacao).success).toBe(true)
      expect(gravacao.passos).toHaveLength(840)
      expect(resumo.passos).toBe(840)
    }
  })

  it('gravação desconhecida é erro', async () => {
    await expect(criarFonteGravacoesExemplo().obter('nao-existe')).rejects.toThrow()
  })
})

describe('criarFonteTreinoExemplo', () => {
  it('responde estado, gerações, modelos e configuração', async () => {
    const fonte = criarFonteTreinoExemplo()
    expect((await fonte.estado()).onde).toBe('PC do Gabriel · RX 7600 XT')
    expect(await fonte.geracoes()).toHaveLength(812)
    expect(await fonte.modelos()).toHaveLength(4)
    expect(await fonte.configuracao()).toEqual({
      populacao: 1024,
      elite: 0.05,
      torneio: 4,
      mutacao: 0.05,
      misturaFases: 0.3,
      arquitetura: [20, 32, 32, 8],
      passoMinutos: 10,
    })
  })
})
