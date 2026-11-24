import { Precos } from '../../domain/contrato'
import { CHAVE_PRECOS, PRECOS_PADRAO, criarRepositorioPrecosLocal } from './repositorioPrecosLocal'

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
    const meus = { ...PRECOS_PADRAO, tarifaKwh: 1.1, alfacePorPe: { baixo: 1.5, medio: 2.5, alto: 3.5 } }
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
})
