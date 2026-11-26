/**
 * Gera os dados de exemplo do dashboard (npm run demo e testes e2e) a partir de
 * uma execução REAL do treino. Nada é inventado: é um recorte (passo 10).
 *
 * Uso, de dashboard/ (precisa de treino/saidas e treino/reavaliacoes no PC):
 *
 *   node scripts/gerar-dados-exemplo.mjs [execucao] [dias]
 *
 * Padrão: a execução fase1-semente9-20261124 e os 3 primeiros dias de cada
 * gravação (só os passos: a massa por dia e o resumo ficam os do ciclo inteiro,
 * para a tela dizer "dia 2 de 35" e a colheita bater com o Dinheiro). Por que recortar: cada gravação inteira tem ~3 MB (5040 passos);
 * cinco delas pesariam 15 MB no repositório. Os 3 dias mantêm o formato e os
 * números de verdade; o resumo do ciclo (massa, energia, nota) continua sendo
 * o do ciclo inteiro, porque é o que a gravação mediu.
 *
 * Saídas, em src/modules/treino/infrastructure/dadosExemplo/:
 *   treino.json            estado, gerações, modelos usados, configuração e a lista
 *   <id da gravação>.json  uma por gravação escolhida (g1, uma do meio, a final,
 *                          regras fixas e sem controle)
 */
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const execucao = process.argv[2] ?? 'fase1-semente9-20261124'
const dias = Number(process.argv[3] ?? 3)
const raiz = resolve(import.meta.dirname, '../..')
const treino = join(raiz, 'treino/saidas', execucao)
const reavaliacao = join(raiz, 'treino/reavaliacoes', execucao)
const destino = resolve(import.meta.dirname, '../src/modules/treino/infrastructure/dadosExemplo')
const ler = (caminho) => JSON.parse(readFileSync(caminho, 'utf8'))

const indice = ler(join(reavaliacao, 'gravacoes/indice.json'))
const campeoes = indice.filter((r) => r.controlador === 'agente').sort((a, b) => a.geracao - b.geracao)
// a primeira, a do meio e a última geração; depois as duas réguas
const meio = campeoes[Math.floor((campeoes.length - 1) / 2)]
const escolhidas = [campeoes[0], meio, campeoes.at(-1), ...indice.filter((r) => r.controlador !== 'agente')].filter(
  (r, i, todas) => todas.indexOf(r) === i,
)

const passos = dias * 144
for (const arquivo of readdirSync(destino).filter((a) => a.endsWith('-gravacao.json'))) rmSync(join(destino, arquivo))
for (const r of escolhidas) {
  const g = ler(join(reavaliacao, 'gravacoes', `${r.id}.json`))
  // a massa por dia fica inteira (35 dias): o ciclo, a colheita e o Dinheiro falam do mesmo ciclo
  const recorte = { ...g, passos: g.passos.slice(0, passos) }
  writeFileSync(join(destino, `${r.id}.json`), JSON.stringify(recorte))
  console.log(`${r.id}: ${recorte.passos.length} passos`)
}

const modelosUsados = new Set(escolhidas.filter((r) => r.controlador === 'agente').map((r) => r.modeloId))
const modelos = [
  ...readdirSync(join(treino, 'modelos')).map((a) => ler(join(treino, 'modelos', a))),
  ...readdirSync(join(reavaliacao, 'modelos')).map((a) => ler(join(reavaliacao, 'modelos', a))),
]
  .filter((m) => modelosUsados.has(m.id))
  .sort((a, b) => a.geracao - b.geracao)

const dados = {
  estado: ler(join(treino, 'estado.json')),
  geracoes: ler(join(treino, 'geracoes.json')),
  modelos,
  configuracao: ler(join(treino, 'config.json')),
  gravacoes: escolhidas.map((r) => ({ ...r, passos: passos })),
}
writeFileSync(join(destino, 'treino.json'), JSON.stringify(dados))
console.log(`treino.json: ${dados.geracoes.length} gerações, ${modelos.length} modelos, ${escolhidas.length} gravações`)
