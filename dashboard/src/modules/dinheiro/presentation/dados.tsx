/** Ponte entre os repositórios do dinheiro (preços e lançamentos) e as telas. */
import { createContext, useContext, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RepositorioLancamentos, RepositorioPrecos } from '../application/portas'
import type { Precos } from '../domain/contrato'
import type { Lancamento } from '../domain/lancamentos'

type Dependencias = { precos: RepositorioPrecos; lancamentos: RepositorioLancamentos }
const Contexto = createContext<Dependencias | null>(null)

export function ProvedorDinheiro({ children, ...deps }: Dependencias & { children: ReactNode }) {
  return <Contexto.Provider value={deps}>{children}</Contexto.Provider>
}

function useDependencias(): Dependencias {
  const deps = useContext(Contexto)
  if (!deps) throw new Error('ProvedorDinheiro ausente: envolva o app com ele (app/App.tsx).')
  return deps
}

export function usePrecos() {
  const { precos } = useDependencias()
  return useQuery({ queryKey: ['precos'], queryFn: () => precos.obter() })
}

export function useSalvarPrecos() {
  const { precos: repo } = useDependencias()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (precos: Precos) => repo.salvar(precos),
    // a tela já mostra o preço novo; o cache acompanha
    onSuccess: (_, precos) => cliente.setQueryData(['precos'], precos),
  })
}

export function useLancamentos() {
  const { lancamentos } = useDependencias()
  return useQuery({ queryKey: ['lancamentos'], queryFn: () => lancamentos.listar() })
}

/** Adicionar e remover: depois de gravar, a lista é lida de novo do repositório. */
export function useMudarLancamentos() {
  const { lancamentos } = useDependencias()
  const cliente = useQueryClient()
  const relerDepois = { onSuccess: () => cliente.invalidateQueries({ queryKey: ['lancamentos'] }) }
  return {
    adicionar: useMutation({ mutationFn: (l: Lancamento) => lancamentos.adicionar(l), ...relerDepois }),
    remover: useMutation({ mutationFn: (id: string) => lancamentos.remover(id), ...relerDepois }),
  }
}
