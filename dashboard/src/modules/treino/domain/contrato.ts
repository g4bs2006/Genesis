/**
 * Contrato de dados do treino (neuroevolução com currículo de 6 fases).
 * Documentado em docs/contrato-dados.md.
 */
import { z } from 'zod'
import { Passo } from '@/modules/estufa/dominio'

export const FaseCurriculo = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
])
export type FaseCurriculo = z.infer<typeof FaseCurriculo>

/** Uma geração do treino. Notas em R$ por ciclo (lucro menos punições). */
export const Geracao = z.object({
  numero: z.number().int().min(0),
  fase: FaseCurriculo,
  melhor: z.number(),
  mediana: z.number(),
  regras: z.number(), // nota das regras fixas no mesmo clima, para comparar
  segundos: z.number().min(0), // quanto a geração levou na GPU
})
export type Geracao = z.infer<typeof Geracao>

/** Um campeão salvo: os pesos da rede e como ele vai nas provas de cada fase. */
export const Modelo = z.object({
  id: z.string(),
  geracao: z.number().int().min(0),
  fase: z.number().int().min(1).max(6),
  arquitetura: z.array(z.number().int().positive()).min(2), // ex.: [20, 32, 32, 8]
  pesos: z.array(z.number()),
  // 0..1 por fase: refazendo a prova da fase N, quanto acerta ("esqueceu?")
  provaPorFase: z.record(z.string(), z.number().min(0).max(1)),
})
export type Modelo = z.infer<typeof Modelo>

/**
 * Gravação de um ciclo: a semente do clima, o modelo e cada passo.
 * As ações vêm gravadas (a reprodução não recalcula a rede: GPU e navegador
 * arredondam diferente, ver "Mostrar a evolução" no plano).
 */
export const Gravacao = z.object({
  id: z.string(),
  semente: z.number().int(),
  modeloId: z.string(),
  passos: z.array(Passo),
})
export type Gravacao = z.infer<typeof Gravacao>

/** Proposta nova: o resumo da lista (sem os passos, que pesam). */
export const ResumoGravacao = z.object({
  id: z.string(),
  semente: z.number().int(),
  modeloId: z.string(),
  titulo: z.string(),
  criadaEm: z.iso.datetime({ offset: true }),
  passos: z.number().int().min(0),
})
export type ResumoGravacao = z.infer<typeof ResumoGravacao>

/** Proposta nova: onde e como o treino está rodando agora. */
export const EstadoTreino = z.object({
  rodando: z.boolean(),
  onde: z.string(), // ex.: "PC do Gabriel · RX 7600"
  faseAtual: FaseCurriculo,
  geracaoAtual: z.number().int().min(0),
  iniciadoEm: z.iso.datetime({ offset: true }),
  criterioPassagem: z.string(), // ex.: "< 5% fora da faixa e nota > regras"
  inicioPorFase: z.record(z.string(), z.number().int()), // geração em que cada fase começou
})
export type EstadoTreino = z.infer<typeof EstadoTreino>

/** Proposta nova: a configuração do treino (só leitura na tela). */
export const ConfigTreino = z.object({
  populacao: z.number().int().positive(),
  elite: z.number().min(0).max(1), // fração que passa intacta
  torneio: z.number().int().positive(), // quantos disputam cada vaga de pai
  mutacao: z.number().min(0), // desvio do ruído somado aos pesos
  misturaFases: z.number().min(0).max(1), // fração de cenários de fases anteriores
  arquitetura: z.array(z.number().int().positive()),
  passoMinutos: z.number().positive(),
})
export type ConfigTreino = z.infer<typeof ConfigTreino>
