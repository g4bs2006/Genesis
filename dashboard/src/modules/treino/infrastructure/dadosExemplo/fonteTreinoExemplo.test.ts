import { Gravacao } from '../../domain/contrato'
import { DadosTreinoExemplo, criarFonteGravacoesExemplo, criarFonteTreinoExemplo } from './fonteTreinoExemplo'
import arquivo from './treino.json'

const dados = DadosTreinoExemplo.parse(arquivo)
/** Pesos de uma MLP: entrada×saída mais um viés por saída, camada a camada. */
const totalPesos = (arq: number[]) => arq.slice(1).reduce((soma, saida, i) => soma + arq[i]! * saida + saida, 0)

describe('treino.json (recorte real da execução fase1-semente9-20261124)', () => {
  it('passa no contrato (Zod)', () => {
    expect(DadosTreinoExemplo.safeParse(arquivo).success).toBe(true)
  })

  it('as 158 gerações da noite, numeradas em ordem, todas na fase 1', () => {
    const { geracoes, estado } = dados
    expect(geracoes).toHaveLength(158)
    geracoes.forEach((g, i) => expect(g).toMatchObject({ numero: i + 1, fase: 1 }))
    expect(estado).toMatchObject({ rodando: false, faseAtual: 1, geracaoAtual: 158 })
  })

  it('os campeões das gravações, com tantos pesos quanto a arquitetura pede', () => {
    expect(dados.modelos.map((m) => m.geracao)).toEqual([1, 75, 158])
    for (const m of dados.modelos) expect(m.pesos).toHaveLength(totalPesos(m.arquitetura))
    expect(totalPesos([20, 32, 32, 8])).toBe(1992)
  })
})

describe('gravações de exemplo', () => {
  it('g1, g75, g158, regras fixas e sem controle: 3 dias de 144 passos, no contrato, com o resumo do ciclo', async () => {
    const fonte = criarFonteGravacoesExemplo()
    const lista = await fonte.listar()
    expect(lista.map((g) => [g.controlador, g.geracao])).toEqual([
      ['agente', 1],
      ['agente', 75],
      ['agente', 158],
      ['regras', null],
      ['nada', null],
    ])
    for (const resumo of lista) {
      const gravacao = await fonte.obter(resumo.id)
      expect(Gravacao.safeParse(gravacao).success).toBe(true)
      expect(gravacao.passos).toHaveLength(432)
      expect(gravacao.massaPorDia).toHaveLength(36) // os 35 dias inteiros + o transplante
      expect(resumo.passos).toBe(432)
      expect(resumo.resumo?.massaPorPe).toBeGreaterThan(0)
    }
  })

  it('gravação desconhecida é erro', async () => {
    await expect(criarFonteGravacoesExemplo().obter('nao-existe')).rejects.toThrow()
  })
})

describe('criarFonteTreinoExemplo', () => {
  it('responde estado, gerações, modelos e a configuração real da noite', async () => {
    const fonte = criarFonteTreinoExemplo()
    expect(await fonte.geracoes()).toHaveLength(158)
    expect(await fonte.modelos()).toHaveLength(3)
    expect(await fonte.configuracao()).toEqual({
      populacao: 1024,
      elite: 0.05,
      torneio: 3,
      mutacao: 0.03,
      misturaFases: 0,
      arquitetura: [20, 32, 32, 8],
      passoMinutos: 10,
    })
  })
})
