import { Precos } from '../../domain/contrato'
import {
  CHAVE_LANCAMENTOS,
  CHAVE_PRECOS,
  PRECOS_PADRAO,
  criarRepositorioLancamentosLocal,
  criarRepositorioPrecosLocal,
} from './repositorioPrecosLocal'

describe('criarRepositorioPrecosLocal', () => {
  beforeEach(() => localStorage.clear())

  it('os padrões passam no contrato', () => {
    expect(Precos.safeParse(PRECOS_PADRAO).success).toBe(true)
  })

  it('sem nada salvo, devolve os padrões', async () => {
    expect(await criarRepositorioPrecosLocal().obter()).toEqual(PRECOS_PADRAO)
  })

  it('salva e lê de volta (ida e volta)', async () => {
    const repo = criarRepositorioPrecosLocal()
    const meus = { ...PRECOS_PADRAO, tarifaKwh: 1.1, alfacePorPe: 2.5 }
    await repo.salvar(meus)
    expect(await criarRepositorioPrecosLocal().obter()).toEqual(meus)
  })

  it('volta aos padrões se o que está salvo é inválido ou nem é JSON', async () => {
    localStorage.setItem(CHAVE_PRECOS, JSON.stringify({ ...PRECOS_PADRAO, tarifaKwh: -1 }))
    expect(await criarRepositorioPrecosLocal().obter()).toEqual(PRECOS_PADRAO)
    localStorage.setItem(CHAVE_PRECOS, '{quebrado')
    expect(await criarRepositorioPrecosLocal().obter()).toEqual(PRECOS_PADRAO)
  })

  it('não grava preço inválido', async () => {
    await expect(criarRepositorioPrecosLocal().salvar({ ...PRECOS_PADRAO, aguaPorM3: -5 })).rejects.toThrow()
    expect(localStorage.getItem(CHAVE_PRECOS)).toBeNull()
  })

  it('preços salvos no formato antigo (três cenários) viram o preço médio', async () => {
    localStorage.setItem(
      CHAVE_PRECOS,
      JSON.stringify({
        alfacePorPe: { baixo: 1, medio: 2.4, alto: 3 },
        tarifaKwh: 0.9,
        nutrientePorKg: 18,
        acidoPorL: 25,
        aguaPorM3: 7,
        mudaPorUnidade: 0.2,
        fixosPorCiclo: 200,
      }),
    )
    expect(await criarRepositorioPrecosLocal().obter()).toEqual({
      ...PRECOS_PADRAO,
      alfacePorPe: 2.4,
      tarifaKwh: 0.9,
      aguaPorM3: 7,
      mudaPorUnidade: 0.2,
      outrosPorCiclo: 200,
    })
  })
})

describe('criarRepositorioLancamentosLocal', () => {
  beforeEach(() => localStorage.clear())
  const venda = { id: 'a', data: '2026-11-20', categoria: 'venda' as const, descricao: 'feira', valor: 300 }

  it('adiciona, sobrevive a abrir de novo e remove', async () => {
    await criarRepositorioLancamentosLocal().adicionar(venda)
    expect(await criarRepositorioLancamentosLocal().listar()).toEqual([venda])
    await criarRepositorioLancamentosLocal().remover('a')
    expect(await criarRepositorioLancamentosLocal().listar()).toEqual([])
  })

  it('um lançamento estragado no navegador fica de fora sem levar os outros', async () => {
    localStorage.setItem(CHAVE_LANCAMENTOS, JSON.stringify([venda, { id: 'b', valor: -3 }]))
    expect(await criarRepositorioLancamentosLocal().listar()).toEqual([venda])
  })

  it('não grava valor negativo', async () => {
    await expect(criarRepositorioLancamentosLocal().adicionar({ ...venda, valor: -1 })).rejects.toThrow()
  })
})
