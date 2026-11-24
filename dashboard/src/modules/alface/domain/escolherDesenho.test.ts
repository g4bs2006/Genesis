import { massaEsperada } from '@/modules/estufa/dominio'
import { escolherDesenho } from './escolherDesenho'

const saudavel = { turgor: 1, clorose: 0, necrose: 0 }

describe('escolherDesenho', () => {
  it('a massa escolhe o estágio mais próximo', () => {
    expect(escolherDesenho({ massa: massaEsperada(5), ...saudavel })).toBe('dia-05')
    expect(escolherDesenho({ massa: 182, ...saudavel })).toBe('dia-20')
    expect(escolherDesenho({ massa: 245, ...saudavel })).toBe('dia-35')
  })

  it('o estresse escolhe o estado, na planta grande', () => {
    expect(escolherDesenho({ massa: 182, turgor: 0.3, clorose: 0, necrose: 0 })).toBe('murcha')
    expect(escolherDesenho({ massa: 182, turgor: 1, clorose: 0.6, necrose: 0 })).toBe('amarelando')
    expect(escolherDesenho({ massa: 182, turgor: 1, clorose: 0, necrose: 0.6 })).toBe('queimada')
  })

  it('muda pequena não usa o desenho de estresse (ele mostra a planta crescida)', () => {
    expect(escolherDesenho({ massa: 30, turgor: 0.2, clorose: 0, necrose: 0 })).toBe('dia-05')
  })
})
