import { Estufa, Evento, Passo, ResumoCiclo } from '../../domain/contrato'
import { instanteDoPasso, Simulacao } from './simulacao'

describe('simulação contínua', () => {
  it('começa em 23/11/2026 à meia-noite e entrega dados que passam no contrato', () => {
    const sim = new Simulacao()
    expect(sim.instante()).toBe('2026-11-23T00:00:00-03:00')
    expect(instanteDoPasso(6 * 25)).toBe('2026-11-24T01:00:00-03:00')
    const passos = sim.ultimosPassos()
    expect(passos.map((p) => p.leitura.estufaId)).toEqual(['estufa-agente', 'estufa-regras', 'estufa-nada'])
    passos.forEach((p) => Passo.parse(p))
    Estufa.array().parse(sim.listarEstufas())
  })

  it('guarda só as últimas 24 h e troca de clima depois de 3 dias', () => {
    const sim = new Simulacao()
    sim.avancar(5 * 144) // 5 dias: passa do fim do primeiro clima
    expect(sim.instante()).toBe('2026-11-28T00:00:00-03:00')
    const tudo = sim.historico('estufa-agente', '2000-01-01T00:00:00Z', '2100-01-01T00:00:00Z')
    expect(tudo).toHaveLength(144)
    expect(sim.historico('estufa-agente', '2026-11-27T23:00:00-03:00', sim.instante())).toHaveLength(7)
    // o campeão passa menos tempo fora da faixa que a estufa sem controle
    const agente = ResumoCiclo.parse(sim.resumoCiclo('estufa-agente'))
    const nada = ResumoCiclo.parse(sim.resumoCiclo('estufa-nada'))
    expect(agente.foraDaFaixa).toBeLessThan(nada.foraDaFaixa)
    expect(
      Evento.array()
        .parse(sim.eventos('estufa-nada'))
        .some((e) => e.tipo === 'erro'),
    ).toBe(true)
  })

  it('onda de calor esquenta o ar de fora e vira evento nas três estufas', () => {
    const sim = new Simulacao()
    const antes = new Simulacao()
    sim.injetar('ondaDeCalor')
    sim.avancar(1)
    antes.avancar(1)
    const fora = (s: Simulacao) => s.ultimosPassos()[0]!.leitura.fora.temperatura
    expect(fora(sim) - fora(antes)).toBeCloseTo(6)
    for (const id of ['estufa-agente', 'estufa-regras', 'estufa-nada']) {
      expect(sim.eventos(id).some((e) => e.tipo === 'perturbacao' && e.titulo === 'Onda de calor')).toBe(true)
    }
    expect(() => sim.eventos('nao-existe')).toThrow()
  })
})
