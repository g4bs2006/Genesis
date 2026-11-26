/**
 * Lançamentos: o que o produtor vendeu e gastou de verdade (passo 11). É o
 * "caderno de entradas e saídas" que o Sebrae e o Senar recomendam ao pequeno
 * produtor, agora no app: cada venda e cada gasto numa linha, somados por
 * categoria para comparar com o previsto do ciclo.
 */
import { z } from 'zod'
import { CATEGORIAS_GASTO, NOME_CATEGORIA, type Categoria } from './contas'

export const Lancamento = z.object({
  id: z.string(),
  data: z.iso.date(), // AAAA-MM-DD
  categoria: z.enum(['venda', ...CATEGORIAS_GASTO]),
  descricao: z.string().max(200),
  valor: z.number().positive(), // R$; venda entra, gasto sai (a categoria diz qual)
})
export type Lancamento = z.infer<typeof Lancamento>

export type Totais = Record<Categoria, number> & { gastos: number; sobra: number }

/** Somas por categoria, o total gasto e o que sobra (vendas − gastos). */
export function totaisDosLancamentos(lancamentos: readonly Lancamento[]): Totais {
  const t = Object.fromEntries((['venda', ...CATEGORIAS_GASTO] as Categoria[]).map((c) => [c, 0])) as Record<
    Categoria,
    number
  >
  for (const l of lancamentos) t[l.categoria] += l.valor
  const gastos = CATEGORIAS_GASTO.reduce((soma, c) => soma + t[c], 0)
  return { ...t, gastos, sobra: t.venda - gastos }
}

/** Para a planilha: ponto e vírgula e vírgula decimal (abre direto no Excel brasileiro). */
export function lancamentosParaCsv(lancamentos: readonly Lancamento[]): string {
  const texto = (s: string) => `"${s.replaceAll('"', '""')}"`
  const linhas = [...lancamentos]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((l) =>
      [
        l.data,
        l.categoria === 'venda' ? 'entrada' : 'saída',
        texto(NOME_CATEGORIA[l.categoria]),
        texto(l.descricao),
        l.valor.toFixed(2).replace('.', ','),
      ].join(';'),
    )
  return ['data;tipo;categoria;descricao;valor_reais', ...linhas].join('\n')
}
