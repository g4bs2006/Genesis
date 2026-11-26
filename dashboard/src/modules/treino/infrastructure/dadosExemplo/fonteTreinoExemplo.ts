/**
 * Adaptadores "dados de exemplo" das portas FonteTreino e FonteGravacoes.
 *
 * Tudo é recorte de uma execução REAL do treino (scripts/gerar-dados-exemplo.mjs):
 * treino.json (gerações, campeões, configuração e a lista de gravações) e uma
 * gravação por arquivo (os 3 primeiros dias, ~260 KB). Cada gravação só é
 * baixada quando alguém pede: import dinâmico, o Vite separa cada arquivo.
 */
import { z } from 'zod'
import { ConfigTreino, EstadoTreino, Geracao, Gravacao, Modelo, ResumoGravacao } from '../../domain/contrato'
import type { FonteGravacoes, FonteTreino } from '../../application/portas'

/** O formato de treino.json, gerado por scripts/gerar-dados-exemplo.mjs. */
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
    // exemplo não muda: nada a avisar
    assinarMudancas: () => () => {},
  }
}

/**
 * import.meta.glob é do Vite: acha os arquivos na hora do build e devolve, para
 * cada um, uma função que faz o import dinâmico. Tipado como unknown de
 * propósito (o TypeScript não precisa ler centenas de KB de JSON): quem dá o tipo é o Zod.
 */
const ARQUIVOS_GRAVACAO = import.meta.glob<unknown>('./*-gravacao.json', { import: 'default' })

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
