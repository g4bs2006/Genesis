/**
 * Confere os JSON que o treino exporta contra os esquemas Zod do dashboard
 * (a fonte da verdade do contrato). Uso, na pasta dashboard/:
 *
 *   node scripts/validar-treino.mjs ../treino/saidas/<execucao>
 *
 * Sai com código 1 e lista os problemas se algum arquivo não seguir o contrato.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url, { alias: { '@': resolve(import.meta.dirname, '../src') } })
const { Geracao, Modelo, Gravacao, ResumoGravacao, EstadoTreino, ConfigTreino } = await jiti.import(
  '../src/modules/treino/domain/contrato.ts',
)

const pasta = process.argv[2]
if (!pasta || !existsSync(pasta)) {
  console.error('Uso: node scripts/validar-treino.mjs <pasta da execução>')
  process.exit(2)
}
const ler = (arq) => JSON.parse(readFileSync(join(pasta, arq), 'utf8'))
const json = (dir) =>
  existsSync(join(pasta, dir)) ? readdirSync(join(pasta, dir)).filter((a) => a.endsWith('.json')) : []

const conferir = [
  ['estado.json', EstadoTreino],
  ['config.json', ConfigTreino],
  ['geracoes.json', Geracao.array()],
  ['gravacoes/indice.json', ResumoGravacao.array()],
  ...json('modelos').map((a) => [`modelos/${a}`, Modelo]),
  ...json('gravacoes')
    .filter((a) => a !== 'indice.json')
    .map((a) => [`gravacoes/${a}`, Gravacao]),
]

let erros = 0
for (const [arq, esquema] of conferir) {
  if (!existsSync(join(pasta, arq))) {
    console.log(`-  ${arq}: ainda não existe`)
    continue
  }
  const r = esquema.safeParse(ler(arq))
  if (r.success) console.log(`ok ${arq}`)
  else {
    erros++
    console.log(`ERRO ${arq}:`)
    for (const p of r.error.issues.slice(0, 5)) console.log(`   ${p.path.join('.')}: ${p.message}`)
  }
}
process.exit(erros ? 1 : 0)
