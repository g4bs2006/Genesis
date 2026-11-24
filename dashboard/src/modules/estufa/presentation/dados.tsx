/**
 * Ponte entre as portas e as telas.
 *
 * O provedor recebe o adaptador escolhido em app/dependencias.ts e o guarda num
 * Context (uma "caixa" do React que qualquer componente abaixo consegue abrir).
 * Os hooks usam o React Query para leituras (cache, carregando, erro) e a
 * assinatura da porta para os passos ao vivo.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ControleSimulacao, EstadoRelogio, FonteEstufa } from '../application/portas'
import { usePreferencias } from '@/shared/stores/preferencias'
import type { Estufa, Passo } from '../domain/contrato'

type Dependencias = { fonte: FonteEstufa; controle: ControleSimulacao | null }
const Contexto = createContext<Dependencias | null>(null)

export function ProvedorEstufa({ children, ...deps }: Dependencias & { children: ReactNode }) {
  return <Contexto.Provider value={deps}>{children}</Contexto.Provider>
}

function useDependencias(): Dependencias {
  const deps = useContext(Contexto)
  if (!deps) throw new Error('ProvedorEstufa ausente: envolva o app com ele (app/App.tsx).')
  return deps
}

export function useEstufas() {
  const { fonte } = useDependencias()
  return useQuery({ queryKey: ['estufas'], queryFn: () => fonte.listarEstufas() })
}

export function useEventos(estufaId: string) {
  const { fonte } = useDependencias()
  return useQuery({ queryKey: ['eventos', estufaId], queryFn: () => fonte.eventos(estufaId) })
}

export function useResumoCiclo(estufaId: string) {
  const { fonte } = useDependencias()
  return useQuery({ queryKey: ['resumo', estufaId], queryFn: () => fonte.resumoCiclo(estufaId) })
}

/** O passo mais recente, ao vivo. `undefined` até chegar o primeiro. */
export function usePassoAtual(estufaId: string): Passo | undefined {
  const { fonte } = useDependencias()
  const [passo, setPasso] = useState<Passo>()
  useEffect(() => fonte.assinarPassos(estufaId, setPasso), [fonte, estufaId])
  return passo
}

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * Janela móvel das últimas horas: busca o histórico até o passo atual e vai
 * somando os passos que chegam. "Agora" é o instante da estufa, não o relógio
 * do computador (a simulação pode estar acelerada ou pausada).
 */
export function useJanela(estufaId: string, duracaoMs = DIA_MS) {
  const { fonte } = useDependencias()
  const cliente = useQueryClient()
  // A janela fica guardada no cache do React Query, por estufa: voltar ao
  // Agora mostra tudo na hora (sem esboço nem pulo) e só continua de onde parou.
  const chave = ['janela', estufaId, duracaoMs]
  const [estado, setEstado] = useState<EstadoJanela>(
    () => cliente.getQueryData<EstadoJanela>(chave) ?? janelaVazia(estufaId),
  )
  useEffect(() => {
    const chaveCache = ['janela', estufaId, duracaoMs]
    let atual = cliente.getQueryData<EstadoJanela>(chaveCache) ?? janelaVazia(estufaId)
    // A âncora é o instante do primeiro passo: o histórico é buscado até ela;
    // os passos seguintes se acumulam aqui, no callback da assinatura.
    return fonte.assinarPassos(estufaId, (passo) => {
      atual = acumular(atual, passo, duracaoMs)
      cliente.setQueryData(chaveCache, atual)
      setEstado(atual)
    })
  }, [fonte, cliente, estufaId, duracaoMs])
  // trocou de estufa e o primeiro passo ainda não chegou: usa o que está no cache
  const { ancora, novos, atual } =
    estado.estufaId === estufaId ? estado : (cliente.getQueryData<EstadoJanela>(chave) ?? janelaVazia(estufaId))

  const historico = useQuery({
    queryKey: ['historico', estufaId, ancora, duracaoMs],
    enabled: !!ancora,
    staleTime: Infinity, // o passado não muda
    queryFn: () => {
      const ate = new Date(ancora!)
      return fonte.historico(estufaId, new Date(ate.getTime() - duracaoMs).toISOString(), ancora!)
    },
  })

  const fim = atual ? new Date(atual.leitura.instante).getTime() : 0
  const passos = [...(historico.data ?? []), ...novos].filter(
    (p) => new Date(p.leitura.instante).getTime() > fim - duracaoMs,
  )
  return { passos, atual, carregando: !atual || historico.isPending }
}

function acumular(e: EstadoJanela, passo: Passo, duracaoMs: number): EstadoJanela {
  if (!e.ancora) return { ...e, ancora: passo.leitura.instante, atual: passo }
  const repetido = e.novos.at(-1)?.leitura.instante === passo.leitura.instante
  if (passo.leitura.instante <= e.ancora || repetido) return { ...e, atual: passo }
  const limite = new Date(passo.leitura.instante).getTime() - duracaoMs
  const novos = [...e.novos, passo].filter((p) => new Date(p.leitura.instante).getTime() > limite)
  return { ...e, novos, atual: passo }
}

type EstadoJanela = { estufaId: string; ancora?: string; atual?: Passo; novos: Passo[] }
const janelaVazia = (estufaId: string): EstadoJanela => ({ estufaId, novos: [] })

/** Relógio da simulação (null quando a estufa é real). */
export function useRelogio(): { estado: EstadoRelogio | null; controle: ControleSimulacao | null } {
  const { controle } = useDependencias()
  const [estado, setEstado] = useState<EstadoRelogio | null>(() => controle?.relogio() ?? null)
  useEffect(() => controle?.assinarRelogio(setEstado), [controle])
  return { estado, controle }
}

/**
 * A estufa aberta no modo Produtor: a escolhida na barra lateral, ou a
 * primeira controlada pelo agente. `undefined` enquanto a lista carrega.
 */
export function useEstufaAtual(): Estufa | undefined {
  const { data } = useEstufas()
  const escolhida = usePreferencias((p) => p.estufaId)
  return data?.find((e) => e.id === escolhida) ?? data?.find((e) => e.controlador.tipo === 'agente') ?? data?.[0]
}
