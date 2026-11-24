import type { ConfigTreino, EstadoTreino, Geracao, Gravacao, Modelo, ResumoGravacao } from '../domain/contrato'

/** O que vem do treino: dados de exemplo (demo) ou o treino de verdade, pelo Supabase. */
export interface FonteTreino {
  estado(): Promise<EstadoTreino>
  geracoes(): Promise<Geracao[]>
  modelos(): Promise<Modelo[]>
  configuracao(): Promise<ConfigTreino>
  /**
   * Avisa quando o treino mandou novidade (geração nova, estado, gravação).
   * As telas então pedem os dados de novo. Devolve a função que cancela.
   * Os dados de exemplo nunca mudam: lá é uma função que não faz nada.
   */
  assinarMudancas(aoMudar: () => void): () => void
}

export interface FonteGravacoes {
  listar(): Promise<ResumoGravacao[]>
  obter(id: string): Promise<Gravacao>
}
