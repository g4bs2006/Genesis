import { expect, test } from '@playwright/test'

// o tour do modo Desenvolvedor (uma vez só) já foi visto: não tampa a página
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('genesis:preferencias', JSON.stringify({ state: { tourDevVisto: true }, version: 0 })),
  )
})

test('gravações: escolhe duas, toca e o dia do ciclo avança', async ({ page }) => {
  await page.goto('/dev/gravacoes')
  await expect(page.getByRole('heading', { level: 1, name: 'Gravações' })).toBeVisible()

  await page.getByRole('button', { name: /Geração 140/ }).click()
  await page.getByRole('button', { name: /Geração 812/ }).click()
  await expect(page.getByRole('region', { name: /^Reprodução de / })).toHaveCount(2)
  // cada gravação tem a sua rede pequena, recalculada no navegador (ilustração)
  await expect(page.getByRole('img', { name: /^Rede do modelo .* recalculada neste passo/ })).toHaveCount(2)

  // o relógio compartilhado: "Dia 1 de 35 · 00:00" quando a gravação chega
  const relogio = page.getByText(/^Dia \d+ de \d+ ·/)
  await expect(relogio).toHaveText(/^Dia 1 de 35/)
  await page.getByRole('radio', { name: '360×' }).click()
  await page.getByRole('button', { name: 'Tocar' }).click()
  await expect(relogio).not.toHaveText(/^Dia 1 de/)

  await expect(page.getByRole('button', { name: 'Copiar link deste instante' })).toBeVisible()
})

test('gravações: o link restaura as gravações e o instante', async ({ page }) => {
  await page.goto('/dev/gravacoes?gravacoes=gravacao-g540&t=240')
  await expect(page.getByRole('region', { name: /^Reprodução de / })).toHaveCount(1)
  // passo 240 de passos de 1 hora = 10 dias depois do início
  await expect(page.getByText(/^Dia \d+ de \d+ ·/)).toHaveText(/^Dia 11 de 35/)
})
