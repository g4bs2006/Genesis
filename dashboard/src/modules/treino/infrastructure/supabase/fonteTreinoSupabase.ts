/**
 * Adaptador "Supabase" das portas FonteTreino e FonteGravacoes: o treino de
 * verdade, para acompanhar de longe (pelo celular, no Vercel).
 *
 * Como os dados chegam aqui:
 *   PC do treino -> treino/saidas/<execucao>/*.json -> treino/nuvem.py
 *   -> Supabase (schema "genesis" + bucket "genesis-gravacoes") -> este arquivo
 *
 * As tabelas estão em supabase/migrations/20261124230000_genesis_treino.sql.
 * Tudo o que chega passa pelo Zod (o mesmo contrato dos dados de exemplo): se o
 * treino mandar algo fora do contrato, o erro aparece aqui, e não como um
 * gráfico torto na tela.
 *
 * Qual execução mostrar: a que mudou por último (a que está rodando agora).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ConfigTreino, EstadoTreino, Geracao, Gravacao, Modelo, ResumoGravacao } from '../../domain/contrato'
import type { FonteGravacoes, FonteTreino } from '../../application/portas'

export const BUCKET_GRAVACOES = 'genesis-gravacoes'

/**
 * O PostgREST (a API que o Supabase põe na frente do Postgres) devolve no
 * máximo 1000 linhas por pedido. Um treino passa disso fácil, então as
 * gerações vêm em páginas.
 */
const TAMANHO_PAGINA = 1000

/**
 * Quantas vezes por minuto, no máximo, o celular pede tudo de novo. Uma geração
 * pode levar poucos segundos; sem esse freio, cada uma viraria uma rodada de
 * pedidos. 5 s é rápido para quem olha e leve para o plano grátis.
 */
const INTERVALO_MINIMO_MS = 5000

const LinhaExecucao = z.object({
  id: z.string(),
  estado: EstadoTreino,
  configuracao: ConfigTreino,
})

const LinhaGravacao = z.object({
  id: z.string(),
  semente: z.number().int(),
  modelo_id: z.string(),
  titulo: z.string(),
  criada_em: z.string(),
  passos: z.number().int(),
  arquivo: z.string(),
})

/** Erro de "ainda não tem nada": a tela mostra um aviso amigável, não uma falha. */
export class SemExecucaoAinda extends Error {
  constructor() {
    super('Nenhum treino enviou dados ainda.')
    this.name = 'SemExecucaoAinda'
  }
}

/** O Postgres devolve "2026-11-24T23:00:00+00:00"; o contrato pede o fuso de São Paulo. */
function paraSaoPaulo(instante: string): string {
  const d = new Date(instante)
  // São Paulo não tem horário de verão desde 2019: sempre -03:00
  const local = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return local.toISOString().replace(/\.\d{3}Z$/, '-03:00')
}

// SupabaseClient<any, 'genesis'>: o cliente apontado para o schema do Gênesis (sem tipos gerados: quem confere é o Zod)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function criarFonteTreinoSupabase(cliente: SupabaseClient<any, 'genesis'>): FonteTreino & FonteGravacoes {
  // A execução atual muda pouco; guardamos o id para os outros pedidos.
  async function execucaoAtual() {
    const { data, error } = await cliente
      .from('execucoes')
      .select('id, estado, configuracao')
      .order('atualizado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Supabase (execucoes): ${error.message}`)
    if (!data) throw new SemExecucaoAinda()
    return LinhaExecucao.parse(data)
  }

  // Cache das gerações por execução: na segunda vez em diante, só pedimos as
  // novas (numero maior que a última que já temos). Uma geração nunca muda.
  const cacheGeracoes = new Map<string, Geracao[]>()

  async function geracoesDe(execucaoId: string): Promise<Geracao[]> {
    const ja = cacheGeracoes.get(execucaoId) ?? []
    const novas: Geracao[] = []
    let depoisDe = ja.at(-1)?.numero ?? -1
    for (;;) {
      const { data, error } = await cliente
        .from('geracoes')
        .select('numero, fase, melhor, mediana, regras, segundos')
        .eq('execucao_id', execucaoId)
        .gt('numero', depoisDe)
        .order('numero')
        .limit(TAMANHO_PAGINA)
      if (error) throw new Error(`Supabase (geracoes): ${error.message}`)
      const pagina = z.array(Geracao).parse(data)
      novas.push(...pagina)
      if (pagina.length < TAMANHO_PAGINA) break
      depoisDe = pagina.at(-1)!.numero
    }
    const todas = novas.length ? [...ja, ...novas] : ja
    cacheGeracoes.set(execucaoId, todas)
    return todas
  }

  return {
    estado: async () => (await execucaoAtual()).estado,
    configuracao: async () => (await execucaoAtual()).configuracao,
    geracoes: async () => geracoesDe((await execucaoAtual()).id),

    async modelos() {
      const { id } = await execucaoAtual()
      const { data, error } = await cliente.from('modelos').select('dados').eq('execucao_id', id).order('geracao')
      if (error) throw new Error(`Supabase (modelos): ${error.message}`)
      return data.map((linha) => Modelo.parse(linha.dados))
    },

    async listar() {
      const { id } = await execucaoAtual()
      const { data, error } = await cliente
        .from('gravacoes')
        .select('id, semente, modelo_id, titulo, criada_em, passos, arquivo')
        .eq('execucao_id', id)
        .order('criada_em')
      if (error) throw new Error(`Supabase (gravacoes): ${error.message}`)
      return z
        .array(LinhaGravacao)
        .parse(data)
        .map((g) =>
          ResumoGravacao.parse({
            id: g.id,
            semente: g.semente,
            modeloId: g.modelo_id,
            titulo: g.titulo,
            criadaEm: paraSaoPaulo(g.criada_em),
            passos: g.passos,
          }),
        )
    },

    async obter(idGravacao) {
      const { id } = await execucaoAtual()
      const { data, error } = await cliente
        .from('gravacoes')
        .select('arquivo')
        .eq('execucao_id', id)
        .eq('id', idGravacao)
        .maybeSingle()
      if (error) throw new Error(`Supabase (gravacoes): ${error.message}`)
      if (!data) throw new Error(`Gravação não encontrada: ${idGravacao}`)
      // O bucket é público: o arquivo baixa por um link direto, sem login.
      const { publicUrl } = cliente.storage.from(BUCKET_GRAVACOES).getPublicUrl(data.arquivo as string).data
      const resposta = await fetch(publicUrl)
      if (!resposta.ok) throw new Error(`Gravação ${idGravacao}: HTTP ${resposta.status}`)
      return Gravacao.parse(await resposta.json())
    },

    assinarMudancas(aoMudar) {
      // Realtime: o Supabase manda um aviso por WebSocket (uma conexão que fica
      // aberta) quando uma linha muda. Assinamos as três tabelas que importam.
      let ultimo = 0
      let pendente: ReturnType<typeof setTimeout> | undefined
      const avisar = () => {
        // "freio" (throttle): no máximo um aviso a cada INTERVALO_MINIMO_MS
        const espera = ultimo + INTERVALO_MINIMO_MS - Date.now()
        if (espera <= 0) {
          ultimo = Date.now()
          aoMudar()
        } else {
          pendente ??= setTimeout(() => {
            pendente = undefined
            ultimo = Date.now()
            aoMudar()
          }, espera)
        }
      }
      const canal = cliente
        .channel('genesis-treino')
        .on('postgres_changes', { event: '*', schema: 'genesis', table: 'execucoes' }, avisar)
        .on('postgres_changes', { event: 'INSERT', schema: 'genesis', table: 'geracoes' }, avisar)
        .on('postgres_changes', { event: '*', schema: 'genesis', table: 'gravacoes' }, avisar)
        .subscribe()
      return () => {
        clearTimeout(pendente)
        void cliente.removeChannel(canal)
      }
    },
  }
}
