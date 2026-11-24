/** Ponte entre o repositório de preços e as telas. */
import { createContext, useContext, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RepositorioPrecos } from '../application/portas'
import type { Precos } from '../domain/contrato'

const Contexto = createContext<RepositorioPrecos | null>(null)

export function ProvedorDinheiro({ precos, children }: { precos: RepositorioPrecos; children: ReactNode }) {
  return <Contexto.Provider value={precos}>{children}</Contexto.Provider>
}

function useRepositorio(): RepositorioPrecos {
  const repo = useContext(Contexto)
  if (!repo) throw new Error('ProvedorDinheiro ausente: envolva o app com ele (app/App.tsx).')
  return repo
}

export function usePrecos() {
  const repo = useRepositorio()
  return useQuery({ queryKey: ['precos'], queryFn: () => repo.obter() })
}

export function useSalvarPrecos() {
  const repo = useRepositorio()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (precos: Precos) => repo.salvar(precos),
    // a tela já mostra o preço novo; o cache acompanha
    onSuccess: (_, precos) => cliente.setQueryData(['precos'], precos),
  })
}
