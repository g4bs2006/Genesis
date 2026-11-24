import { massaEsperada } from '../../domain/crescimento'
import { FAIXAS, estadoDe, valorDe, type Variavel } from '../../domain/faixas'
import arquivo from './estufas.json'
import { DadosEstufaExemplo, criarFonteEstufaExemplo } from './fonteEstufaExemplo'

const dados = DadosEstufaExemplo.parse(arquivo)
const passosDe = (id: string) => dados.passos[id] ?? []
const resumoDe = (id: string) => dados.resumos.find((r) => r.estufaId === id)!

describe('estufas.json (dados de exemplo)', () => {
  it('passa no contrato (Zod)', () => {
    expect(DadosEstufaExemplo.safeParse(arquivo).success).toBe(true)
  })

  it('tem 4 estufas com 144 passos de 10 min terminando às 14h30 de 23/11', () => {
    expect(dados.estufas.map((e) => e.id)).toEqual(['estufa-1', 'campeao-f3', 'pid', 'regras'])
    for (const e of dados.estufas) {
      const passos = passosDe(e.id)
      expect(passos).toHaveLength(144)
      expect(passos.at(-1)!.leitura.instante).toBe('2026-11-23T14:30:00-03:00')
    }
  })

  it('estufa 1: dia 23 de 35, 182 g por pé, a mesma massa da curva de crescimento', () => {
    const e1 = dados.estufas[0]!
    expect(e1).toMatchObject({ diaDoCiclo: 23, diasDoCiclo: 35, massaPorPe: 182 })
    expect(Math.round(massaEsperada(23))).toBe(182)
  })

  it('estufa 1 agora: exatamente 1 ponto pede atenção (o pH) e nenhum em risco', () => {
    const leitura = passosDe('estufa-1').at(-1)!.leitura
    const estados = (Object.keys(FAIXAS) as Variavel[]).map((v) => [v, estadoDe(valorDe(leitura, v), FAIXAS[v])])
    expect(estados.filter(([, e]) => e === 'atencao')).toEqual([['ph', 'atencao']])
    expect(estados.some(([, e]) => e === 'risco')).toBe(false)
  })

  it('o agente ganha das regras no resumo do ciclo', () => {
    const [agente, regras] = [resumoDe('estufa-1'), resumoDe('regras')]
    expect(agente.foraDaFaixa).toBeLessThan(regras.foraDaFaixa)
    expect(agente.energiaKwh).toBeLessThan(regras.energiaKwh)
    expect(agente.massaPorPe).toBeGreaterThan(regras.massaPorPe)
  })

  it('todo evento "barrado" aponta para um passo com ação barrada', () => {
    const barrados = dados.eventos.filter((e) => e.tipo === 'barrado')
    expect(barrados.length).toBeGreaterThan(0)
    for (const e of barrados) expect(passosDe(e.estufaId)[e.passo!]!.barradas.length).toBeGreaterThan(0)
  })
})

describe('criarFonteEstufaExemplo', () => {
  afterEach(() => vi.useRealTimers())

  it('assinarPassos entrega o último passo na hora e depois um passo novo a cada 3 s', () => {
    vi.useFakeTimers()
    const recebidos: string[] = []
    const cancelar = criarFonteEstufaExemplo().assinarPassos('estufa-1', (p) => recebidos.push(p.leitura.instante))
    expect(recebidos).toEqual(['2026-11-23T14:30:00-03:00'])

    vi.advanceTimersByTime(6000)
    // a reprise segue o relógio para frente, de 10 em 10 min
    expect(recebidos).toEqual(['2026-11-23T14:30:00-03:00', '2026-11-23T14:40:00-03:00', '2026-11-23T14:50:00-03:00'])

    cancelar()
    vi.advanceTimersByTime(6000)
    expect(recebidos).toHaveLength(3)
  })

  it('historico filtra pelo intervalo de instantes', async () => {
    const passos = await criarFonteEstufaExemplo().historico(
      'estufa-1',
      '2026-11-23T13:00:00-03:00',
      '2026-11-23T14:00:00-03:00',
    )
    expect(passos).toHaveLength(7)
    expect(passos[0]!.leitura.instante).toBe('2026-11-23T13:00:00-03:00')
  })

  it('eventos e resumo por estufa; estufa desconhecida no resumo é erro', async () => {
    const fonte = criarFonteEstufaExemplo()
    const eventos = await fonte.eventos('estufa-1')
    expect(eventos.every((e) => e.estufaId === 'estufa-1')).toBe(true)
    expect(eventos.map((e) => e.tipo)).toEqual(expect.arrayContaining(['acerto', 'erro', 'barrado', 'perturbacao']))
    await expect(fonte.resumoCiclo('nao-existe')).rejects.toThrow()
  })
})
