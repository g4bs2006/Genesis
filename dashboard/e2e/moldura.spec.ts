import { expect, test } from '@playwright/test'

test('produtor: abre no Agora com a frase de estado e o selo de dados de exemplo', async ({ page }) => {
  await page.goto('/')
  // estufa 1 dos dados de exemplo: só o pH pede atenção
  await expect(page.getByRole('heading', { level: 1, name: 'Quase tudo na faixa' })).toBeVisible()
  await expect(page.getByText('1 ponto pede atenção')).toBeVisible()
  await expect(page.getByText('estufa simulada · dados de exemplo')).toBeVisible()
  await expect(page.getByText('Lucro previsto do ciclo')).toBeVisible()
})

test('ciclo: estágios, curva e histórico de alertas', async ({ page }) => {
  await page.goto('/ciclo')
  await expect(page.getByRole('heading', { level: 1, name: 'Ciclo' })).toBeVisible()
  await expect(page.getByText('Crescimento rápido')).toBeVisible()
  await expect(page.getByRole('img', { name: /Curva de crescimento/ })).toBeVisible()
})

test('navega pelas abas (celular) ou pela barra lateral (desktop)', async ({ page, isMobile }) => {
  await page.goto('/')
  const navegacao = isMobile ? page.getByRole('navigation', { name: 'Abas' }) : page.getByRole('navigation').first()
  await navegacao.getByRole('link', { name: 'Ciclo' }).click()
  await expect(page).toHaveURL(/\/ciclo$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Ciclo' })).toBeVisible()
})

test('trocar para Desenvolvedor leva às estufas lado a lado', async ({ page, isMobile }) => {
  await page.goto('/ajustes')
  await page.getByRole('main').getByRole('radio', { name: 'Desenvolvedor' }).click()
  await expect(page).toHaveURL(/\/dev$/)
  if (!isMobile) await expect(page.getByRole('link', { name: 'Treino e gerações' })).toBeVisible()
})

test('visor: tela cheia, sem navegação', async ({ page }) => {
  await page.goto('/visor')
  await expect(page.getByRole('heading', { name: 'Visor' })).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
})

test('desktop: Agora com gráficos e a comparação com as regras', async ({ page, isMobile }) => {
  test.skip(isMobile, 'gráficos e comparação são do desktop')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Últimas 24 horas' })).toBeVisible()
  await expect(page.getByText(/O agente rende R\$/)).toBeVisible()
  await page.getByRole('tab', { name: 'pH e EC' }).click()
  await expect(page.getByText('pH da solução')).toBeVisible()
})

test('histórico exporta CSV', async ({ page, isMobile }) => {
  test.skip(isMobile, 'histórico é do desktop')
  await page.goto('/historico')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  expect((await download).suggestedFilename()).toMatch(/^genesis-.*\.csv$/)
})
