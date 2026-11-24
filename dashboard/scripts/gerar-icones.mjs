// Gera os ícones PNG do PWA a partir da marca (o mesmo desenho do favicon.svg).
// Uso: node scripts/gerar-icones.mjs  (precisa do Chromium do Playwright)
// Adaptado do Tesserato (scripts/gerar-icones.mjs).
import { chromium } from 'playwright'

// Broto de duas folhas, em traço: o Gênesis transforma algo morto em vida
const marca = (traco) => `
  <path d="M16 27.5V15.5" stroke="${traco}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M16 18.5C16 12.5 11.5 9 5.5 9c0 6 4 9.5 10.5 9.5Z" stroke="${traco}" stroke-width="1.8" stroke-linejoin="round" fill="none"/>
  <path d="M16 15.5c0-5.5 4-9 10.5-9 0 5.5-4 9-10.5 9Z" stroke="${traco}" stroke-width="1.8" stroke-linejoin="round" fill="none"/>`

// fundo cinza do Lightfield, marca preta; "escala" é a fração do ícone ocupada pela marca
const icone = (tamanho, escala) => {
  const lado = 32 / escala
  const margem = (lado - 32) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="${-margem} ${-margem} ${lado} ${lado}">
    <rect x="${-margem}" y="${-margem}" width="${lado}" height="${lado}" fill="#f5f5f5"/>${marca('#141414')}</svg>`
}

const alvos = [
  ['public/pwa-192.png', 192, 0.62],
  ['public/pwa-512.png', 512, 0.62],
  ['public/pwa-maskable-512.png', 512, 0.5],
  ['public/apple-touch-icon.png', 180, 0.6],
]

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const pagina = await navegador.newPage()
for (const [arquivo, tamanho, escala] of alvos) {
  await pagina.setViewportSize({ width: tamanho, height: tamanho })
  await pagina.setContent(`<style>body{margin:0}</style>${icone(tamanho, escala)}`)
  await pagina.screenshot({ path: arquivo, omitBackground: false })
  console.log('gerado', arquivo)
}
await navegador.close()
