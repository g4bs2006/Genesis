/**
 * Adaptadores "dados de exemplo" das portas FonteTreino e FonteGravacoes.
 *
 * treino.json (gerações, campeões, configuração e a lista de gravações) é
 * pequeno e vem junto com o app. Cada gravação (um ciclo de 35 dias, ~0,5 MB)
 * só é baixada quando alguém abre a reprodução: import dinâmico, o Vite separa
 * cada arquivo num pedaço próprio.
 */
import { z } from 'zod'
import { ConfigTreino, EstadoTreino, Geracao, Gravacao, Modelo, ResumoGravacao } from '../../domain/contrato'
import type { FonteGravacoes, FonteTreino } from '../../application/portas'

/** O formato de treino.json, gerado por scripts/gerar-dados-exemplo.ts. */
export const DadosTreinoExemplo = z.object({
  estado: EstadoTreino,
  geracoes: z.array(Geracao),
  modelos: z.array(Modelo),
  configuracao: ConfigTreino,
  gravacoes: z.array(ResumoGravacao),
})
export type DadosTreinoExemplo = z.infer<typeof DadosTreinoExemplo>

const LATENCIA_MS = 150

let promessa: Promise<DadosTreinoExemplo> | undefined
/** import() dinâmico: os ~140 KB do JSON só baixam quando alguém pede. */
const carregar = () => (promessa ??= import('./treino.json').then((m) => DadosTreinoExemplo.parse(m.default)))

const comAtraso = <T>(valor: (d: DadosTreinoExemplo) => T) =>
  carregar().then(
    (d) =>
      new Promise<T>((resolver, rejeitar) =>
        setTimeout(() => {
          try {
            resolver(valor(d))
          } catch (erro) {
            rejeitar(erro)
          }
        }, LATENCIA_MS),
      ),
  )

export function criarFonteTreinoExemplo(): FonteTreino {
  return {
    estado: () => comAtraso((d) => d.estado),
    geracoes: () => comAtraso((d) => d.geracoes),
    modelos: () => comAtraso((d) => d.modelos),
    configuracao: () => comAtraso((d) => d.configuracao),
  }
}

/**
 * import.meta.glob é do Vite: acha os arquivos na hora do build e devolve, para
 * cada um, uma função que faz o import dinâmico. Tipado como unknown de
 * propósito (o TypeScript não precisa ler 0,5 MB de JSON): quem dá o tipo é o Zod.
 */
const ARQUIVOS_GRAVACAO = import.meta.glob<unknown>('./gravacao-*.json', { import: 'default' })

export function criarFonteGravacoesExemplo(): FonteGravacoes {
  return {
    listar: () => comAtraso((d) => d.gravacoes),
    async obter(id) {
      const importar = ARQUIVOS_GRAVACAO[`./${id}.json`]
      if (!importar) throw new Error(`Gravação não encontrada: ${id}`)
      return Gravacao.parse(await importar())
    },
  }
}
