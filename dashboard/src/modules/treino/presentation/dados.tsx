/** Ponte entre as portas do treino e as telas (mesmo padrão de estufa/presentation/dados.tsx). */
import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { FonteGravacoes, FonteTreino } from '../application/portas'

type Dependencias = { treino: FonteTreino; gravacoes: FonteGravacoes }
const Contexto = createContext<Dependencias | null>(null)

export function ProvedorTreino({ children, ...deps }: Dependencias & { children: ReactNode }) {
  return <Contexto.Provider value={deps}>{children}</Contexto.Provider>
}

function useDependencias(): Dependencias {
  const deps = useContext(Contexto)
  if (!deps) throw new Error('ProvedorTreino ausente: envolva o app com ele (app/App.tsx).')
  return deps
}

export function useEstadoTreino() {
  const { treino } = useDependencias()
  return useQuery({ queryKey: ['treino', 'estado'], queryFn: () => treino.estado() })
}

export function useGeracoes() {
  const { treino } = useDependencias()
  return useQuery({ queryKey: ['treino', 'geracoes'], queryFn: () => treino.geracoes() })
}

export function useModelos() {
  const { treino } = useDependencias()
  return useQuery({ queryKey: ['treino', 'modelos'], queryFn: () => treino.modelos() })
}

export function useConfigTreino() {
  const { treino } = useDependencias()
  return useQuery({ queryKey: ['treino', 'config'], queryFn: () => treino.configuracao() })
}

export function useGravacoes() {
  const { gravacoes } = useDependencias()
  return useQuery({ queryKey: ['gravacoes'], queryFn: () => gravacoes.listar() })
}

export function useGravacao(id: string | undefined) {
  const { gravacoes } = useDependencias()
  return useQuery({
    queryKey: ['gravacoes', id],
    enabled: !!id,
    queryFn: () => gravacoes.obter(id!),
    // gravação não muda depois de gravada
    staleTime: Infinity,
  })
}
