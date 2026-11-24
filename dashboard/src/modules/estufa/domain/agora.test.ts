import { alertaPrincipal, estadoDoGrupo, fraseDeEstado, GRUPOS_CELULAR, tendencia } from './agora'
import type { Passo } from './contrato'

const passoBase: Passo = {
  leitura: {
    estufaId: 'e',
    instante: '2026-11-23T14:30:00-03:00',
    ar: { temperatura: 23, umidade: 70, vpd: 0.9, co2: 600, luz: 400 },
    solucao: { ph: 6, ec: 1.5, temperaturaAgua: 21, nivel: 0.7 },
    fora: { temperatura: 28, umidade: 55, radiacao: 600 },
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
}

const comPh = (ph: number, dosagemAcido = 0): Passo => ({
  ...passoBase,
  leitura: { ...passoBase.leitura, solucao: { ...passoBase.leitura.solucao, ph } },
  acoes: { ...passoBase.acoes, dosagemAcido },
})

describe('fraseDeEstado', () => {
  it('tudo bem', () => {
    expect(fraseDeEstado([passoBase], { tipo: 'agente', modeloId: 'g812' })).toEqual({
      titulo: 'Tudo na faixa',
      apoio: 'O agente está no controle.',
    })
  })

  it('oscilar na beira da faixa não muda a frase (precisa de 2 passos)', () => {
    expect(fraseDeEstado([comPh(6.4), comPh(6.6)], { tipo: 'agente', modeloId: 'g812' }).titulo).toBe('Tudo na faixa')
  })

  it('um ponto de atenção, como no rascunho', () => {
    expect(fraseDeEstado([comPh(6.6), comPh(6.6)], { tipo: 'agente', modeloId: 'g812' })).toEqual({
      titulo: 'Quase tudo na faixa',
      apoio: 'O agente está no controle. 1 ponto pede atenção.',
    })
  })
})

describe('grupos e tendência', () => {
  it('o grupo pega o pior estado', () => {
    const ph = GRUPOS_CELULAR.find((g) => g.id === 'ph')!
    expect(estadoDoGrupo(comPh(6.6), ph)).toBe('atencao')
  })

  it('compara com uma hora atrás', () => {
    const subindo = [5.9, 6.0, 6.1, 6.2, 6.3, 6.4, 6.6].map((ph) => comPh(ph))
    expect(tendencia(subindo, 'ph')).toBe('subindo')
    expect(tendencia([comPh(6)], 'ph')).toBe('estavel')
  })
})

describe('alertaPrincipal', () => {
  it('nada a dizer quando tudo está na faixa', () => {
    expect(alertaPrincipal([passoBase])).toBeNull()
  })

  it('pH subindo: conta a dose de ácido de 20 min atrás', () => {
    const passos = [comPh(6.3), comPh(6.4), comPh(6.4), comPh(6.5), comPh(6.5, 4), comPh(6.6), comPh(6.6)]
    const alerta = alertaPrincipal(passos)!
    expect(alerta.estado).toBe('atencao')
    expect(alerta.titulo).toBe('pH acima da faixa: 6,6 e subindo.')
    expect(alerta.feito).toBe('O agente já dosou 4 ml de ácido há 20 min.')
  })
})
