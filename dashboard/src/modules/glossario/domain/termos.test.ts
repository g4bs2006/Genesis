import { TERMOS, termo, type IdTermo } from './termos'

const entradas = Object.entries(TERMOS) as [IdTermo, (typeof TERMOS)[IdTermo]][]

// Fim de frase: ponto, exclamação ou interrogação seguidos de espaço ou do fim
// do texto (assim "0,5" ou "µmol/m²/s" não contam).
const frases = (texto: string) => (texto.match(/[.!?](\s|$)/g) ?? []).length
const palavras = (texto: string) => texto.trim().split(/\s+/).length

describe('TERMOS', () => {
  it.each(entradas)('%s: id igual à chave e campos preenchidos', (chave, t) => {
    expect(t.id).toBe(chave)
    expect(t.nome.trim()).not.toBe('')
    expect(t.curto.trim()).not.toBe('')
    expect(t.explicacao.trim()).not.toBe('')
    if (t.exemplo !== undefined) expect(t.exemplo.trim()).not.toBe('')
  })

  it.each(entradas)('%s: curto com até 8 palavras', (_, t) => {
    expect(palavras(t.curto)).toBeLessThanOrEqual(8)
  })

  it.each(entradas)('%s: explicação com 1 a 3 frases e até 320 caracteres', (_, t) => {
    expect(frases(t.explicacao)).toBeGreaterThanOrEqual(1)
    expect(frases(t.explicacao)).toBeLessThanOrEqual(3)
    expect(t.explicacao.length).toBeLessThanOrEqual(320)
  })

  it.each(entradas)('%s: relacionados existem e não apontam para si', (chave, t) => {
    for (const r of t.relacionados ?? []) {
      expect(TERMOS).toHaveProperty(r)
      expect(r).not.toBe(chave)
    }
  })

  it('termo() devolve o mesmo objeto da tabela', () => {
    expect(termo('vpd')).toBe(TERMOS.vpd)
    expect(termo('vpd').curto).toBe('a sede do ar')
  })
})
