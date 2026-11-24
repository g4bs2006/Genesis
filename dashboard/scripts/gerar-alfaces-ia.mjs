// Gera os desenhos da alface com IA (OpenAI, modelo Sol + ferramenta de imagem).
//
// Uso:
//   GENESIS_CHAVE_ARQUIVO=caminho/do/.env node scripts/gerar-alfaces-ia.mjs <nome> "<pedido>" [id-anterior]
//
// - A chave (OPENAI_API_KEY) é lida do arquivo .env indicado, só em memória:
//   nunca vai para o repositório nem para a saída.
// - <id-anterior>: continua a conversa de uma imagem já gerada, para manter o
//   mesmo traço, o mesmo cano e o mesmo ângulo em todos os desenhos.
// - Salva em src/modules/alface/assets/<nome>.webp (depois rode scripts/limpar-alfaces.mjs) e imprime o id da resposta
//   e o uso de tokens (para acompanhar o gasto).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const [, , nome, pedido, anterior] = process.argv
if (!nome || !pedido) throw new Error('uso: node scripts/gerar-alfaces-ia.mjs <nome> "<pedido>" [id-anterior]')

const arquivo = process.env.GENESIS_CHAVE_ARQUIVO
if (!arquivo) throw new Error('defina GENESIS_CHAVE_ARQUIVO com o caminho do .env que tem OPENAI_API_KEY')
const linha = readFileSync(arquivo, 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('OPENAI_API_KEY='))
const chave = linha
  ?.slice('OPENAI_API_KEY='.length)
  .trim()
  .replace(/^["']|["']$/g, '')
if (!chave) throw new Error('OPENAI_API_KEY não encontrada no arquivo indicado')

// O estilo vale para todos os desenhos: desenho, não foto; calmo, para a interface
const ESTILO =
  'Flat friendly illustration, not photorealistic: clean hand-drawn look with soft shading and thin darker outlines, ' +
  'calm natural colors that sit well in a minimal gray dashboard. Transparent background, no text, no ground shadow, ' +
  'the whole subject centered with some margin.'

const corpo = {
  model: 'gpt-6.1-sol',
  reasoning: { effort: 'low' },
  input: `${pedido}\n\nStyle: ${ESTILO}`,
  tools: [
    {
      type: 'image_generation',
      background: 'transparent',
      output_format: 'webp',
      output_compression: 85,
      quality: 'medium',
      size: '1024x1024',
    },
  ],
  tool_choice: { type: 'image_generation' },
  ...(anterior ? { previous_response_id: anterior } : {}),
}

const resposta = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
})
const dados = await resposta.json()
if (!resposta.ok) throw new Error(`OpenAI ${resposta.status}: ${JSON.stringify(dados.error ?? dados).slice(0, 400)}`)

const imagem = dados.output?.find((o) => o.type === 'image_generation_call')?.result
if (!imagem) throw new Error(`sem imagem na resposta: ${JSON.stringify(dados.output?.map((o) => o.type))}`)
mkdirSync('src/modules/alface/assets', { recursive: true })
writeFileSync(`src/modules/alface/assets/${nome}.webp`, Buffer.from(imagem, 'base64'))
console.log(JSON.stringify({ nome, id: dados.id, uso: dados.usage }))
