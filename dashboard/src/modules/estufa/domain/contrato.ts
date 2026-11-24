/**
 * Contrato de dados da estufa: o formato do que o backend (simulador em
 * PyTorch, estufa real via MQTT) entrega ao dashboard. Documentado em
 * docs/contrato-dados.md. Mudou aqui, muda lá, e o backend precisa saber.
 *
 * Cada tipo é escrito como esquema Zod: além do tipo do TypeScript (que só
 * existe na hora de compilar), o esquema confere o dado de verdade quando ele
 * chega. Se o backend mandar um campo errado, o erro aparece na porta de
 * entrada, e não como um "NaN" perdido numa tela.
 */
import { z } from 'zod'

/** Instante em ISO 8601 com fuso (America/Sao_Paulo, ex.: 2026-11-23T14:30:00-03:00) */
export const Instante = z.iso.datetime({ offset: true })

/** Uma leitura de sensores: o que ler_sensores() devolve no plano. */
export const Leitura = z.object({
  estufaId: z.string(),
  instante: Instante,
  ar: z.object({
    temperatura: z.number(), // °C
    umidade: z.number().min(0).max(100), // % de umidade relativa
    vpd: z.number().min(0), // kPa: a "sede" do ar
    co2: z.number().min(0), // ppm
    luz: z.number().min(0), // µmol/m²/s (luz útil para a planta, PPFD)
  }),
  solucao: z.object({
    ph: z.number().min(0).max(14),
    ec: z.number().min(0), // mS/cm: quanto nutriente está dissolvido
    temperaturaAgua: z.number(), // °C
    nivel: z.number().min(0).max(1), // fração do reservatório cheio
  }),
  fora: z.object({
    temperatura: z.number(), // °C
    umidade: z.number().min(0).max(100), // %
    radiacao: z.number().min(0), // W/m²
  }),
  tarifaKwh: z.number().min(0), // R$/kWh neste instante
  /**
   * Campos que a fonte não mede nem simula e preencheu com valor de exemplo
   * (ex.: ['solucao.ph'] no simulador de brinquedo). Opcional: a estufa real
   * não manda. A tela mostra o selo "exemplo" nesses campos.
   */
  exemplos: z.array(z.string()).optional(),
})
export type Leitura = z.infer<typeof Leitura>

/** O que o agente decidiu neste passo: acionar(acoes). */
export const Acoes = z.object({
  exaustor: z.number().min(0).max(1), // fração da potência
  nebulizacao: z.number().min(0).max(1),
  sombreamento: z.number().min(0).max(1), // fração fechada
  luz: z.number().min(0).max(1),
  dosagemAB: z.number().min(0), // ml no passo
  dosagemAcido: z.number().min(0), // ml no passo
  reposicaoAgua: z.boolean(),
  bomba: z.boolean(),
})
export type Acoes = z.infer<typeof Acoes>
export type Atuador = keyof Acoes

export const ATUADORES = [
  'exaustor',
  'nebulizacao',
  'sombreamento',
  'luz',
  'dosagemAB',
  'dosagemAcido',
  'reposicaoAgua',
  'bomba',
] as const satisfies readonly Atuador[]

/** Uma ação que a camada de segurança barrou (ex.: dosar ácido com pH 5,4). */
export const AcaoBarrada = z.object({
  atuador: z.enum(ATUADORES),
  pedido: z.number(),
  motivo: z.string(),
})
export type AcaoBarrada = z.infer<typeof AcaoBarrada>

/** Um passo do controle: o que o agente leu, o que fez e o que foi barrado. */
export const Passo = z.object({
  leitura: Leitura,
  acoes: Acoes,
  barradas: z.array(AcaoBarrada),
})
export type Passo = z.infer<typeof Passo>

export const Controlador = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('agente'), modeloId: z.string() }),
  z.object({ tipo: z.literal('regras') }),
  z.object({ tipo: z.literal('pid') }),
  z.object({ tipo: z.literal('nada') }),
])
export type Controlador = z.infer<typeof Controlador>

export const Estufa = z.object({
  id: z.string(),
  nome: z.string(),
  origem: z.enum(['simulada', 'real']),
  controlador: Controlador,
  plantas: z.number().int().positive(),
  diaDoCiclo: z.number().min(0),
  diasDoCiclo: z.number().positive(),
  massaPorPe: z.number().min(0), // gramas por pé, estimada
})
export type Estufa = z.infer<typeof Estufa>

/** Eventos para "o que acertou ou errou". */
export const Evento = z.object({
  estufaId: z.string(),
  instante: Instante,
  tipo: z.enum(['acerto', 'erro', 'barrado', 'perturbacao']),
  titulo: z.string(),
  detalhe: z.string(),
  variavel: z.string().optional(),
  passo: z.number().int().optional(),
})
export type Evento = z.infer<typeof Evento>

/**
 * Resumo de um ciclo de uma estufa (proposta nova, não estava na seção 5):
 * o que a tabela "Agente × regras" e o Dinheiro precisam. Consumos somados no
 * ciclo; foraDaFaixa é a fração do tempo (0..1) fora da faixa boa.
 */
export const ResumoCiclo = z.object({
  estufaId: z.string(),
  massaPorPe: z.number().min(0), // g, na colheita (ou projetada)
  energiaKwh: z.number().min(0),
  aguaL: z.number().min(0),
  nutrienteG: z.number().min(0),
  acidoMl: z.number().min(0),
  foraDaFaixa: z.number().min(0).max(1),
  foraPorVariavel: z.record(z.string(), z.number().min(0).max(1)),
  barradas: z.number().int().min(0),
})
export type ResumoCiclo = z.infer<typeof ResumoCiclo>

/** Perturbações que o desenvolvedor injeta em todas as estufas ao mesmo tempo. */
export const PERTURBACOES = [
  'ondaDeCalor',
  'phDescalibra',
  'bombaTrava',
  'quedaDeEnergia',
  'ruidoSensores',
  'tarifaDePico',
] as const
export type Perturbacao = (typeof PERTURBACOES)[number]
