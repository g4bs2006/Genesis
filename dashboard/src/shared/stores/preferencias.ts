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
  /** Estufa aberta no modo Produtor (null = a primeira com agente) */
  estufaId: string | null
  /** o tour do modo Desenvolvedor já foi visto (aparece uma vez só) */
  tourDevVisto: boolean
  /** barra lateral do desktop recolhida numa faixa só de ícones */
  barraRecolhida: boolean
  trocarModo: (modo: Modo) => void
  trocarTema: (tema: Tema) => void
  escolherEstufa: (estufaId: string) => void
  marcarTourDev: () => void
  recolherBarra: (recolhida: boolean) => void
}

export const usePreferencias = create<Preferencias>()(
  persist(
    (set) => ({
      modo: 'produtor',
      tema: 'sistema',
      estufaId: null,
      tourDevVisto: false,
      barraRecolhida: false,
      trocarModo: (modo) => set({ modo }),
      trocarTema: (tema) => set({ tema }),
      escolherEstufa: (estufaId) => set({ estufaId }),
      marcarTourDev: () => set({ tourDevVisto: true }),
      recolherBarra: (barraRecolhida) => set({ barraRecolhida }),
    }),
    { name: 'genesis:preferencias' },
  ),
)

/** O Astryx fala inglês: converte o nosso tema para o `mode` do <Theme>. */
export const modoDoTema = { sistema: 'system', claro: 'light', escuro: 'dark' } as const
