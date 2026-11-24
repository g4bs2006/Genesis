import type { Precos } from '../domain/contrato'

/** Onde ficam os preços do produtor. Hoje no navegador; depois, no banco. */
export interface RepositorioPrecos {
  obter(): Promise<Precos>
  salvar(precos: Precos): Promise<void>
}
