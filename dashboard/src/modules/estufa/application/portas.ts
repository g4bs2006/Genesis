/**
 * Portas do módulo estufa: o que as telas podem pedir, sem saber quem responde.
 * Quem implementa (adaptador) fica em infrastructure/; quem escolhe o
 * adaptador é só src/app/dependencias.ts.
 */
import type { Estufa, Evento, Passo, ResumoCiclo } from '../domain/contrato'

export interface FonteEstufa {
  listarEstufas(): Promise<Estufa[]>
  /**
   * Opcional: avisa quando o estado das estufas muda (dia do ciclo, massa por
   * pé), com a lista nova. A reprodução de gravações avisa; devolve a função que cancela.
   */
  assinarEstufas?(aoMudar: (estufas: Estufa[]) => void): () => void
  /**
   * Avisa a cada passo novo da estufa (o mais recente chega logo de cara).
   * Devolve a função que cancela a assinatura.
   */
  assinarPassos(estufaId: string, aoReceber: (passo: Passo) => void): () => void
  /** Passos entre dois instantes ISO, em ordem de tempo. */
  historico(estufaId: string, de: string, ate: string): Promise<Passo[]>
  eventos(estufaId: string): Promise<Evento[]>
  resumoCiclo(estufaId: string): Promise<ResumoCiclo>
}

export type EstadoRelogio = { pausado: boolean; velocidade: number; instante: string }

/**
 * Só existe quando a estufa é reproduzida (uma gravação do treino): o relógio.
 * A estufa real não tem pausa (dependencias.ts devolveria null).
 */
export interface ControleSimulacao {
  relogio(): EstadoRelogio
  assinarRelogio(aoMudar: (estado: EstadoRelogio) => void): () => void
  pausar(): void
  continuar(): void
  /** Quantos passos de 10 min por segundo de tela (6 = uma hora de estufa por segundo) */
  acelerar(velocidade: number): void
}
