/**
 * Preferências de tela: modo (Produtor ou Desenvolvedor) e tema.
 *
 * Zustand é uma biblioteca de "estado global": um lugar só onde a tela guarda
 * escolhas que várias partes do app leem (a barra lateral, as abas, o tema).
 * O `persist` salva no navegador (localStorage), então a escolha sobrevive a
 * fechar e abrir o app. Dados da estufa NÃO moram aqui: eles vêm das portas,
 * pelo React Query.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Modo = 'produtor' | 'desenvolvedor'
export type Tema = 'sistema' | 'claro' | 'escuro'

type Preferencias = {
  modo: Modo
  tema: Tema
  /**
   * A gravação que alimenta o modo Produtor, escolhida pelo Desenvolvedor na
   * Vitrine (null = o campeão mais recente). Fica só neste navegador: o banco
   * não aceita escrita anônima, e assim continua.
   */
  estufaId: string | null
  /** passos de 10 min por segundo de tela na reprodução (null = o padrão, 1 h por segundo) */
  velocidadeReproducao: number | null
  /** o tour do modo Desenvolvedor já foi visto (aparece uma vez só) */
  tourDevVisto: boolean
  /** barra lateral do desktop recolhida numa faixa só de ícones */
  barraRecolhida: boolean
  trocarModo: (modo: Modo) => void
  trocarTema: (tema: Tema) => void
  escolherEstufa: (estufaId: string | null) => void
  trocarVelocidade: (passosPorSegundo: number) => void
  marcarTourDev: () => void
  recolherBarra: (recolhida: boolean) => void
}

export const usePreferencias = create<Preferencias>()(
  persist(
    (set) => ({
      modo: 'produtor',
      tema: 'sistema',
      estufaId: null,
      velocidadeReproducao: null,
      tourDevVisto: false,
      barraRecolhida: false,
      trocarModo: (modo) => set({ modo }),
      trocarTema: (tema) => set({ tema }),
      escolherEstufa: (estufaId) => set({ estufaId }),
      trocarVelocidade: (velocidadeReproducao) => set({ velocidadeReproducao }),
      marcarTourDev: () => set({ tourDevVisto: true }),
      recolherBarra: (barraRecolhida) => set({ barraRecolhida }),
    }),
    { name: 'genesis:preferencias' },
  ),
)

/** O Astryx fala inglês: converte o nosso tema para o `mode` do <Theme>. */
export const modoDoTema = { sistema: 'system', claro: 'light', escuro: 'dark' } as const
