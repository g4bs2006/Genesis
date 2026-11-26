/**
 * Testa o adaptador Supabase sem internet: um "cliente falso" que responde como
 * o supabase-js, a partir de tabelas em memória. Confere o que importa: as
 * páginas de 1000 gerações, o cache incremental e o aviso de "nenhum treino".
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import arquivo from '../dadosExemplo/treino.json'
import { DadosTreinoExemplo } from '../dadosExemplo/fonteTreinoExemplo'
import { criarFonteTreinoSupabase, SemExecucaoAinda } from './fonteTreinoSupabase'

const exemplo = DadosTreinoExemplo.parse(arquivo)
type Linha = Record<string, unknown>

/** Imita só a parte do supabase-js que o adaptador usa: from().select().eq().gt().order().limit(). */
function clienteFalso(tabelas: Record<string, Linha[]>) {
  const pedidos: string[] = []
  const cliente = {
    storage: {
      from: () => ({
        getPublicUrl: (caminho: string) => ({ data: { publicUrl: `nuvem/${caminho}` } }),
        // os dois índices existem no bucket falso
        list: async () => ({ data: [{ name: 'indice.json' }, { name: 'indice-reavaliacao.json' }], error: null }),
      }),
    },
    from(tabela: string) {
      let linhas = [...(tabelas[tabela] ?? [])]
      const consulta = {
        select: () => consulta,
        eq: (coluna: string, valor: unknown) => ((linhas = linhas.filter((l) => l[coluna] === valor)), consulta),
        gt: (coluna: string, valor: number) => (
          (linhas = linhas.filter((l) => (l[coluna] as number) > valor)),
          consulta
        ),
        order: (coluna: string, opcoes?: { ascending?: boolean }) => {
          const sinal = opcoes?.ascending === false ? -1 : 1
          linhas.sort((a, b) => (String(a[coluna]) < String(b[coluna]) ? -sinal : sinal))
          if (typeof linhas[0]?.[coluna] === 'number')
            linhas.sort((a, b) => sinal * ((a[coluna] as number) - (b[coluna] as number)))
          return consulta
        },
        limit: (n: number) => ((linhas = linhas.slice(0, n)), consulta),
        maybeSingle: () => Promise.resolve({ data: linhas[0] ?? null, error: null }),
        then: (ok: (r: { data: Linha[]; error: null }) => unknown) => {
          pedidos.push(tabela)
          return Promise.resolve({ data: linhas, error: null }).then(ok)
        },
      }
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<never, 'genesis'>, pedidos }
}

const geracoes = (n: number, desde = 0) =>
  Array.from({ length: n }, (_, i) => ({
    execucao_id: 'e1',
    numero: desde + i,
    fase: 1,
    melhor: i,
    mediana: i / 2,
    regras: 80,
    segundos: 2,
  }))

const execucao = { id: 'e1', estado: exemplo.estado, configuracao: exemplo.configuracao, atualizado_em: '2026-11-24' }

describe('fonte de treino no Supabase', () => {
  it('sem nenhuma execução, avisa com SemExecucaoAinda (a tela mostra um aviso, não um erro)', async () => {
    const { cliente } = clienteFalso({ execucoes: [] })
    await expect(criarFonteTreinoSupabase(cliente).estado()).rejects.toBeInstanceOf(SemExecucaoAinda)
  })

  it('busca as 2500 gerações em páginas de 1000 e, depois, só as novas', async () => {
    const tabelas = { execucoes: [execucao], geracoes: geracoes(2500) }
    const { cliente, pedidos } = clienteFalso(tabelas)
    const fonte = criarFonteTreinoSupabase(cliente)

    const primeira = await fonte.geracoes()
    expect(primeira).toHaveLength(2500)
    expect(primeira.at(-1)!.numero).toBe(2499)
    expect(pedidos.filter((p) => p === 'geracoes')).toHaveLength(3) // 1000 + 1000 + 500

    tabelas.geracoes.push(...geracoes(3, 2500))
    const segunda = await fonte.geracoes()
    expect(segunda).toHaveLength(2503)
    expect(pedidos.filter((p) => p === 'geracoes')).toHaveLength(4) // só um pedido a mais
  })

  const resumo = {
    estufaId: 'regras',
    massaPorPe: 210,
    energiaKwh: 300,
    aguaL: 50,
    nutrienteG: 0,
    acidoMl: 0,
    foraDaFaixa: 0.2,
    foraPorVariavel: { temperatura: 0.1 },
    barradas: 0,
  }

  const linhaIndice = (id: string) => ({
    id,
    semente: 7,
    modeloId: 'm',
    titulo: 't',
    criadaEm: '2026-11-24T20:00:00-03:00',
    passos: 840,
  })

  it('converte o resumo das gravações para o contrato (camelCase e fuso de São Paulo)', async () => {
    const { cliente } = clienteFalso({
      execucoes: [execucao],
      gravacoes: [
        {
          execucao_id: 'e1',
          id: 'g10',
          semente: 7,
          modelo_id: 'm10',
          titulo: 'Campeão da geração 10',
          criada_em: '2026-11-25T02:00:00+00:00',
          passos: 840,
          arquivo: 'e1/g10.json',
        },
        {
          execucao_id: 'e1',
          id: 'regras',
          semente: 7,
          modelo_id: 'regras-fixas',
          titulo: 'Regras fixas',
          criada_em: '2026-11-25T01:00:00+00:00',
          passos: 840,
          arquivo: 'e1/regras.json',
        },
      ],
    })
    // o índice do treino diz só da g10; o da reavaliação (que vale mais) traz as regras
    const indices: Record<string, unknown> = {
      'nuvem/e1/indice.json': [{ ...linhaIndice('g10'), controlador: 'agente', geracao: 10 }],
      'nuvem/e1/indice-reavaliacao.json': [
        { ...linhaIndice('regras'), controlador: 'regras', geracao: null, resumo: { ...resumo, nota: 120.5 } },
      ],
    }
    const fonte = criarFonteTreinoSupabase(cliente, async (url) => indices[url] ?? null)
    expect(await fonte.listar()).toEqual([
      {
        id: 'g10',
        semente: 7,
        modeloId: 'm10',
        titulo: 'Campeão da geração 10',
        criadaEm: '2026-11-24T23:00:00-03:00',
        passos: 840,
        controlador: 'agente',
        geracao: 10,
      },
      // as réguas vêm depois dos campeões, mesmo criadas antes
      {
        id: 'regras',
        semente: 7,
        modeloId: 'regras-fixas',
        titulo: 'Regras fixas',
        criadaEm: '2026-11-24T22:00:00-03:00',
        passos: 840,
        controlador: 'regras',
        geracao: null,
        resumo: { ...resumo, nota: 120.5 },
      },
    ])
  })
})
