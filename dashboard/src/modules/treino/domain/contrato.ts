/**
 * Contrato de dados do treino (neuroevolução com currículo de 6 fases).
 * Documentado em docs/contrato-dados.md.
 */
import { z } from 'zod'
import { Passo, ResumoCiclo } from '@/modules/estufa/dominio'

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

/** Quem controlou a estufa na gravação: um campeão, as regras fixas ou ninguém. */
export const ControladorGravado = z.enum(['agente', 'regras', 'nada'])
export type ControladorGravado = z.infer<typeof ControladorGravado>

/** O resumo do ciclo gravado (medido no treino, controle/metricas.py) e a nota em R$. */
export const ResumoDaGravacao = ResumoCiclo.extend({ nota: z.number() })
export type ResumoDaGravacao = z.infer<typeof ResumoDaGravacao>

/**
 * Gravação de um ciclo: a semente do clima, o modelo e cada passo.
 * As ações vêm gravadas (a reprodução não recalcula a rede: GPU e navegador
 * arredondam diferente, ver "Mostrar a evolução" no plano).
 */
export const Gravacao = z.object({
  id: z.string(),
  semente: z.number().int(),
  modeloId: z.string(), // nas regras e em "sem controle": 'regras-fixas' e 'sem-controle'
  passos: z.array(Passo),
  // Novos no passo 09 (opcionais: as gravações antigas não têm)
  controlador: ControladorGravado.optional(), // ausente = 'agente'
  massaPorDia: z.array(z.number().min(0)).optional(), // g/pé: [0] no transplante, [d] no fim do dia d
  resumo: ResumoDaGravacao.optional(),
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
  // Novos no passo 09 (opcionais: as gravações antigas não têm)
  controlador: ControladorGravado.optional(),
  geracao: z.number().int().min(0).nullable().optional(), // a geração do campeão; null nas réguas
  resumo: ResumoDaGravacao.optional(),
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
