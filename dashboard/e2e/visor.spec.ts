import { expect, test } from '@playwright/test'

test('visor: estufa, relógio e os 4 cards, sem nada para tocar', async ({ page }) => {
  await page.goto('/visor')
  const visor = page.getByRole('region', { name: /^Visor da / })
  await expect(visor).toBeVisible()
  // o nome da estufa é o título da tela
  await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty()
  await expect(page.locator('time')).toHaveText(/^\d{2}:\d{2}$/)
  for (const nome of ['Ar', 'pH', 'Nutrientes', 'Água']) {
    await expect(visor.getByRole('article', { name: new RegExp(`^${nome},`) })).toBeVisible()
  }
  await expect(page.getByRole('meter', { name: 'Reservatório' })).toBeVisible()
  // tela fixa: nenhum botão, link ou navegação
  await expect(page.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('link')).toHaveCount(0)
  await expect(page.getByRole('navigation')).toHaveCount(0)
})
