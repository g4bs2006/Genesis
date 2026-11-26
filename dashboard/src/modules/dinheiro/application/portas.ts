import type { Precos } from '../domain/contrato'
import type { Lancamento } from '../domain/lancamentos'

/** Onde ficam os preços do produtor. Hoje no navegador; depois, no banco. */
export interface RepositorioPrecos {
  obter(): Promise<Precos>
  salvar(precos: Precos): Promise<void>
}

/** Onde ficam as vendas e os gastos lançados. Hoje no navegador (sem login ainda); depois, no banco. */
export interface RepositorioLancamentos {
  listar(): Promise<Lancamento[]>
  adicionar(lancamento: Lancamento): Promise<void>
  remover(id: string): Promise<void>
}
