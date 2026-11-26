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

  // os dados de exemplo são um recorte real (3 dias) da execução fase1-semente9-20261124
  await page.getByRole('button', { name: /geração 1 · / }).click()
  await page.getByRole('button', { name: /geração 158 · / }).click()
  await expect(page.getByRole('region', { name: /^Reprodução de / })).toHaveCount(2)
  // cada gravação tem a sua rede pequena, recalculada no navegador (ilustração)
  await expect(page.getByRole('img', { name: /^Rede do modelo .* recalculada neste passo/ })).toHaveCount(2)

  // o relógio compartilhado: "Dia 1 de 3 · 00:00" quando a gravação chega
  const relogio = page.getByText(/^Dia \d+ de \d+ ·/)
  await expect(relogio).toHaveText(/^Dia 1 de 3/)
  await page.getByRole('radio', { name: '360×' }).click()
  await page.getByRole('button', { name: 'Tocar' }).click()
  await expect(relogio).not.toHaveText(/^Dia 1 de/)

  await expect(page.getByRole('button', { name: 'Copiar link deste instante' })).toBeVisible()
})

test('gravações: o link restaura as gravações e o instante', async ({ page }) => {
  await page.goto('/dev/gravacoes?gravacoes=fase1-semente9-20261124-g75-gravacao&t=240')
  await expect(page.getByRole('region', { name: /^Reprodução de / })).toHaveCount(1)
  // passo 240 de passos de 10 min = 1 dia e 16 h depois do transplante
  await expect(page.getByText(/^Dia \d+ de \d+ ·/)).toHaveText(/^Dia 2 de 3 · 16:00/)
})
