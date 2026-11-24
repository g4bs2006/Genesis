/** Ponte entre as portas do treino e as telas (mesmo padrão de estufa/presentation/dados.tsx). */
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FonteGravacoes, FonteTreino } from '../application/portas'
import { SemExecucaoAinda } from '../infrastructure/supabase'

// "Nenhum treino ainda" não é falha de rede: não adianta tentar de novo (o
// React Query tentaria 3 vezes, e a tela ficaria uns segundos no esboço).
// Quando o treino mandar dados, o Realtime avisa e a tela busca sozinha.
const tentarDeNovo = (tentativas: number, erro: Error) => !(erro instanceof SemExecucaoAinda) && tentativas < 3

/** De onde vêm os dados do treino: os de exemplo ou o treino de verdade (nuvem). */
export type OrigemTreino = 'exemplo' | 'nuvem'

type Dependencias = { treino: FonteTreino; gravacoes: FonteGravacoes; origem: OrigemTreino }
const Contexto = createContext<Dependencias | null>(null)

export function ProvedorTreino({ children, ...deps }: Dependencias & { children: ReactNode }) {
  const consultas = useQueryClient()
  // Quando o treino manda novidade, marcamos as consultas do treino como
  // "velhas": o React Query busca de novo só as que estão na tela agora.
  useEffect(
    () =>
      deps.treino.assinarMudancas(() => {
        void consultas.invalidateQueries({ queryKey: ['treino'] })
        // só a lista; uma gravação já baixada não muda
        void consultas.invalidateQueries({ queryKey: ['gravacoes'], exact: true })
      }),
    [deps.treino, consultas],
  )
  return <Contexto.Provider value={deps}>{children}</Contexto.Provider>
}

export function useOrigemTreino(): OrigemTreino {
  return useDependencias().origem
}

function useDependencias(): Dependencias {
  const deps = useContext(Contexto)
  if (!deps) throw new Error('ProvedorTreino ausente: envolva o app com ele (app/App.tsx).')
  return deps
}

export function useEstadoTreino() {
  const { treino } = useDependencias()
  return useQuery({ retry: tentarDeNovo, queryKey: ['treino', 'estado'], queryFn: () => treino.estado() })
}

export function useGeracoes() {
  const { treino } = useDependencias()
  return useQuery({ retry: tentarDeNovo, queryKey: ['treino', 'geracoes'], queryFn: () => treino.geracoes() })
}

export function useModelos() {
  const { treino } = useDependencias()
  return useQuery({ retry: tentarDeNovo, queryKey: ['treino', 'modelos'], queryFn: () => treino.modelos() })
}

export function useConfigTreino() {
  const { treino } = useDependencias()
  return useQuery({ retry: tentarDeNovo, queryKey: ['treino', 'config'], queryFn: () => treino.configuracao() })
}

export function useGravacoes() {
  const { gravacoes } = useDependencias()
  return useQuery({ retry: tentarDeNovo, queryKey: ['gravacoes'], queryFn: () => gravacoes.listar() })
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
