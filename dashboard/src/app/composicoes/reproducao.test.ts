import type { Passo } from '@/modules/estufa/dominio'
import {
  alternar,
  andar,
  avancar,
  buscar,
  criarReproducao,
  diaDoPasso,
  eventoMaisProximo,
  eventosDaGravacao,
  fluxoNoPasso,
  lerParametros,
  montarBusca,
  mudarVelocidade,
  passoAtual,
  passoDoInstante,
} from './reproducao'

const TOTAL = 840

describe('relógio da reprodução', () => {
  it('pausado, o tempo passa e a posição não muda', () => {
    const e = criarReproducao()
    expect(avancar(e, 1000, TOTAL)).toBe(e)
  })

  it('tocando, anda passos por segundo conforme a velocidade', () => {
    const e = alternar(criarReproducao(), TOTAL) // 60× = 10 passos/s
    expect(passoAtual(avancar(e, 1000, TOTAL))).toBe(10)
    expect(passoAtual(avancar(e, 50, TOTAL))).toBe(0) // meio passo: a tela ainda mostra o 0
  })

  it('trocar a velocidade muda o quanto anda no mesmo tempo', () => {
    const e = mudarVelocidade(alternar(criarReproducao(), TOTAL), 360) // 60 passos/s
    expect(passoAtual(avancar(e, 1000, TOTAL))).toBe(60)
    expect(passoAtual(avancar(mudarVelocidade(e, 1), 6000, TOTAL))).toBe(1)
  })

  it('para no último passo e não passa dele', () => {
    const e = alternar(criarReproducao(830), TOTAL)
    const fim = avancar(e, 60_000, TOTAL)
    expect(fim.posicao).toBe(TOTAL - 1)
    expect(fim.tocando).toBe(false)
  })

  it('tocar no fim recomeça do início', () => {
    const e = alternar(criarReproducao(TOTAL - 1), TOTAL)
    expect(e).toMatchObject({ posicao: 0, tocando: true })
  })

  it('buscar limita à gravação e arredonda para um passo inteiro', () => {
    const e = criarReproducao()
    expect(buscar(e, 123.4, TOTAL).posicao).toBe(123)
    expect(buscar(e, -5, TOTAL).posicao).toBe(0)
    expect(buscar(e, 5000, TOTAL).posicao).toBe(TOTAL - 1)
  })

  it('as setas andam um passo a partir do passo mostrado', () => {
    const e = criarReproducao(10.7)
    expect(andar(e, 1, TOTAL).posicao).toBe(11)
    expect(andar(e, -1, TOTAL).posicao).toBe(9)
    expect(andar(criarReproducao(0), -1, TOTAL).posicao).toBe(0)
  })

  it('evento mais próximo', () => {
    const eventos = [{ passo: 10 }, { passo: 50 }, { passo: 90 }]
    expect(eventoMaisProximo(eventos, 0)).toBe(0)
    expect(eventoMaisProximo(eventos, 60)).toBe(1)
    expect(eventoMaisProximo(eventos, 80)).toBe(2)
    expect(eventoMaisProximo([], 3)).toBe(-1)
  })
})

/** Um passo com tudo na faixa; `mudar` ajusta o que o teste precisa. */
function passo(hora: number, mudar: (p: Passo) => void = () => {}): Passo {
  const p: Passo = {
    leitura: {
      estufaId: 'x',
      instante: new Date(Date.parse('2026-10-31T00:00:00-03:00') + hora * 3_600_000).toISOString(),
      ar: { temperatura: 22, umidade: 70, vpd: 0.8, co2: 600, luz: 0 },
      solucao: { ph: 6, ec: 1.5, temperaturaAgua: 20, nivel: 0.9 },
      fora: { temperatura: 20, umidade: 70, radiacao: 0 },
      tarifaKwh: 0.7,
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
  }
  mudar(p)
  return p
}

describe('o que se tira da gravação', () => {
  it('evento quando a variável sai da faixa (só a saída) e quando a segurança barra', () => {
    const passos = [
      passo(0),
      passo(1, (p) => (p.leitura.solucao.ph = 7)),
      passo(2, (p) => (p.leitura.solucao.ph = 7)), // continua fora: não repete
      passo(3, (p) => p.barradas.push({ atuador: 'dosagemAcido', pedido: 5, motivo: 'pH baixo' })),
    ]
    expect(eventosDaGravacao(passos)).toEqual([
      { passo: 1, tipo: 'saiu', texto: 'pH saiu da faixa' },
      { passo: 3, tipo: 'barrada', texto: 'Segurança barrou a dose de ácido' },
    ])
  })

  it('dia do ciclo pelo instante', () => {
    const passos = Array.from({ length: 49 }, (_, h) => passo(h))
    expect(diaDoPasso(passos, 0)).toBe(0)
    expect(diaDoPasso(passos, 36)).toBe(1.5)
  })

  it('instante dentro da gravação: o passo mais perto; fora: o mesmo horário no primeiro dia', () => {
    const passos = Array.from({ length: 48 }, (_, h) => passo(h))
    expect(passoDoInstante(passos, '2026-11-01T14:20:00-03:00')).toBe(38)
    expect(passoDoInstante(passos, '2026-11-23T14:40:00-03:00')).toBe(15)
    expect(passoDoInstante(passos, 'não é data')).toBe(0)
  })

  it('link: monta e lê de volta', () => {
    const busca = montarBusca(['gravacao-g140', 'gravacao-g812'], 120)
    expect(lerParametros(new URLSearchParams(busca))).toEqual({
      ids: ['gravacao-g140', 'gravacao-g812'],
      t: 120,
      evento: null,
    })
    // repetidos saem, no máximo 4, t inválido vira null
    expect(lerParametros(new URLSearchParams('gravacoes=a,a,b,c,d,e&t=-1'))).toEqual({
      ids: ['a', 'b', 'c', 'd'],
      t: null,
      evento: null,
    })
  })
})

describe('fluxo da rede numa gravação', () => {
  // rede mínima 20 → 8 só com vieses: a saída não depende da entrada, dá para prever
  const vies = (v: number) => ({ arquitetura: [20, 8], pesos: [...Array(160).fill(0), ...Array(8).fill(v)] })
  const comAcoes = (exaustor: number) => [passo(0, (p) => (p.acoes.exaustor = exaustor))]

  it('devolve as ativações de cada camada', () => {
    const { ativacoes } = fluxoNoPasso(vies(0), comAcoes(0.5), 0)
    expect(ativacoes.map((a) => a.length)).toEqual([20, 8])
    expect(ativacoes[1]![0]).toBeCloseTo(0.5) // sigmoide(0)
  })

  it('não avisa quando a saída bate com a ação gravada (dentro da tolerância)', () => {
    // sombreamento, nebulização e luz gravados em 0; a saída é 0,5: divergem
    const g = comAcoes(0.53)
    g[0]!.acoes.sombreamento = 0.5
    g[0]!.acoes.nebulizacao = 0.5
    g[0]!.acoes.luz = 0.5
    expect(fluxoNoPasso(vies(0), g, 0).divergencias).toEqual([])
  })

  it('avisa quando a saída se afasta da gravada, menos se a segurança barrou', () => {
    const g = comAcoes(0.9)
    g[0]!.acoes.sombreamento = 0.5
    g[0]!.acoes.nebulizacao = 0.5
    g[0]!.acoes.luz = 0.5
    expect(fluxoNoPasso(vies(0), g, 0).divergencias).toEqual([{ saida: 0, gravado: 0.9, recalculado: 0.5 }])
    g[0]!.barradas = [{ atuador: 'exaustor', pedido: 0.5, motivo: 'teste' }]
    expect(fluxoNoPasso(vies(0), g, 0).divergencias).toEqual([])
  })
})
