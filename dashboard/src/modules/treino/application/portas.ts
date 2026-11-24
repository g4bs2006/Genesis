import type { ConfigTreino, EstadoTreino, Geracao, Gravacao, Modelo, ResumoGravacao } from '../domain/contrato'

/** O que vem do treino (hoje: dados de exemplo; depois: os arquivos que o treino exporta). */
export interface FonteTreino {
  estado(): Promise<EstadoTreino>
  geracoes(): Promise<Geracao[]>
  modelos(): Promise<Modelo[]>
  configuracao(): Promise<ConfigTreino>
}

export interface FonteGravacoes {
  listar(): Promise<ResumoGravacao[]>
  obter(id: string): Promise<Gravacao>
}
