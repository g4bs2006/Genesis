// Limpa o fundo dos desenhos da alface (alfa < 40 vira transparente: tira o "halo")
// e reduz para 640 px. Rodar depois de gerar: node scripts/limpar-alfaces.mjs --corrigir
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
const corrigir = process.argv.includes('--corrigir')
const nomes = ['dia-05', 'dia-12', 'dia-20', 'dia-28', 'dia-35', 'murcha', 'amarelando', 'queimada']
const b = await chromium.launch()
const p = await b.newPage()
for (const n of nomes) {
  const arq = `src/modules/alface/assets/${n}.webp`
  const dados = 'data:image/webp;base64,' + readFileSync(arq).toString('base64')
  const r = await p.evaluate(
    async ({ dados, corrigir }) => {
      const img = new Image()
      img.src = dados
      await img.decode()
      const lado = corrigir ? 640 : img.width
      const c = document.createElement('canvas')
      c.width = lado
      c.height = lado
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, lado, lado)
      const d = ctx.getImageData(0, 0, lado, lado)
      let baixos = 0
      let maxCanto = 0
      for (let i = 3; i < d.data.length; i += 4) {
        const a = d.data[i]
        if (a > 0 && a < 40) baixos++
        if (i < lado * 4 * 20) maxCanto = Math.max(maxCanto, a)
        // fundo quase transparente vira transparente de verdade (o "halo" do quadrado)
        if (corrigir && a < 40) d.data[i] = 0
      }
      if (!corrigir) return { baixos, maxCanto, lado }
      ctx.putImageData(d, 0, 0)
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.75))
      const buf = new Uint8Array(await blob.arrayBuffer())
      return { baixos, maxCanto, lado, bytes: Array.from(buf) }
    },
    { dados, corrigir },
  )
  if (corrigir) writeFileSync(arq, Buffer.from(r.bytes))
  console.log(
    n,
    'alfa baixo:',
    r.baixos,
    'canto max:',
    r.maxCanto,
    r.lado,
    corrigir ? `-> ${Math.round(r.bytes.length / 1024)} KB` : '',
  )
}
await b.close()
