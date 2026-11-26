import type { Passo } from '../../domain/contrato'
import { criarFonteEstufaReproducao, type FonteDeGravacoes } from './fonteEstufaReproducao'

/** Uma gravação de mentira: n passos de 10 min a partir de 1º/10, com a temperatura subindo 0,1 °C por passo. */
function gravacao(n: number): Passo[] {
  return Array.from({ length: n }, (_, i) => ({
    leitura: {
      estufaId: 'campeao',
      instante: new Date(Date.UTC(2026, 9, 1, 3) + i * 600_000).toISOString().replace('.000Z', 'Z'),
      ar: { temperatura: 20 + i * 0.1, umidade: 70, vpd: 0.8, co2: 420, luz: 100 },
      solucao: { ph: 6, ec: 1.5, temperaturaAgua: 21, nivel: 0.8 },
      fora: { temperatura: 18, umidade: 80, radiacao: 0 },
      tarifaKwh: 0.85,
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
  }))
}

const resumo = {
  estufaId: 'x',
  massaPorPe: 240,
  energiaKwh: 400,
  aguaL: 50,
  nutrienteG: 0,
  acidoMl: 0,
  foraDaFaixa: 0.5,
  foraPorVariavel: {},
  barradas: 0,
}

const fonte: FonteDeGravacoes = {
  listar: async () => [
    { id: 'g1', modeloId: 'm1', controlador: 'agente', geracao: 1, passos: 288 },
    { id: 'regras', modeloId: 'regras-fixas', controlador: 'regras', geracao: null, passos: 288 },
  ],
  obter: async (id) => ({ passos: gravacao(288), massaPorDia: [1, 100, 200], ...(id === 'g1' && { resumo }) }),
}

describe('reprodução de gravações', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lista as gravações como estufas, com nome de desenvolvedor e os 1000 pés do simulador', async () => {
    const r = criarFonteEstufaReproducao(fonte, { agora: () => Date.now() })
    const estufas = await r.listarEstufas()
    expect(estufas.map((e) => [e.nome, e.controlador.tipo, e.plantas, e.diasDoCiclo])).toEqual([
      ['Geração 1', 'agente', 1000, 2],
      ['Regras fixas', 'regras', 1000, 2],
    ])
  })

  it('toca no relógio: 6 passos por segundo, sem pular nenhum, e a massa acompanha o dia', async () => {
    const r = criarFonteEstufaReproducao(fonte, { agora: () => Date.now(), velocidade: 6 })
    const recebidos: number[] = []
    r.assinarPassos('g1', (p) => recebidos.push(Math.round((p.leitura.ar.temperatura - 20) * 10)))
    await vi.advanceTimersByTimeAsync(0) // a gravação chega
    expect(recebidos).toEqual([0]) // o passo de agora chega logo de cara
    await vi.advanceTimersByTimeAsync(1000)
    expect(recebidos).toEqual([0, 1, 2, 3, 4, 5, 6])
    // 144 passos depois: fim do dia 1, massa de 100 g
    await vi.advanceTimersByTimeAsync(23_000)
    const [g1] = await r.listarEstufas()
    expect(g1!.diaDoCiclo).toBeCloseTo(1, 5)
    expect(g1!.massaPorPe).toBeCloseTo(100, 5)
  })

  it('o histórico e os eventos só vão até agora (nada do futuro da gravação)', async () => {
    const r = criarFonteEstufaReproducao(fonte, { agora: () => Date.now(), velocidade: 6, posicao: 30 })
    r.assinarPassos('g1', () => {})
    await vi.advanceTimersByTimeAsync(0)
    const tudo = await r.historico('g1', '2026-01-01T00:00:00-03:00', '2027-01-01T00:00:00-03:00')
    expect(tudo).toHaveLength(31) // passos 0 a 30
    // a temperatura passa de 26,6 °C (risco) no passo 70: ainda não aconteceu
    expect(await r.eventos('g1')).toEqual([])
  })

  it('no fim do ciclo, recomeça do transplante; pausar para o relógio', async () => {
    const r = criarFonteEstufaReproducao(fonte, { agora: () => Date.now(), velocidade: 144, posicao: 280 })
    let ultimo = -1
    r.assinarPassos('g1', (p) => (ultimo = Math.round((p.leitura.ar.temperatura - 20) * 10)))
    await vi.advanceTimersByTimeAsync(100)
    expect(ultimo).toBeLessThan(280) // deu a volta
    r.pausar()
    const parado = ultimo
    await vi.advanceTimersByTimeAsync(2000)
    expect(ultimo).toBe(parado)
    expect(r.relogio().pausado).toBe(true)
  })

  it('o resumo do ciclo vem da gravação; sem ele, avisa', async () => {
    const r = criarFonteEstufaReproducao(fonte, { agora: () => Date.now() })
    expect((await r.resumoCiclo('g1')).massaPorPe).toBe(240)
    await expect(r.resumoCiclo('regras')).rejects.toThrow(/resumo/)
  })
})
