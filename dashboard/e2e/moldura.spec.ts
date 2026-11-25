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

test('dinheiro: lucro previsto e editar preço com vírgula', async ({ page }) => {
  await page.goto('/dinheiro')
  await expect(page.getByRole('heading', { level: 1, name: 'Dinheiro' })).toBeVisible()
  await expect(page.getByText('Para onde vai o dinheiro da venda')).toBeVisible()
  await page.getByRole('button', { name: 'Editar preços' }).click()
  const medio = page.getByLabel('Preço médio')
  await medio.fill('2,5')
  await medio.press('Enter')
  await page.getByRole('button', { name: 'Salvar preços' }).click()
  // o cenário médio passa a mostrar o preço novo
  await expect(page.getByText(/R\$\s?2,50\/pé/)).toBeVisible()
})

test('treino: currículo, curva de aprendizado e esquecimento', async ({ page, isMobile }) => {
  test.skip(isMobile, 'treino detalhado é do desktop')
  await page.goto('/dev/treino')
  await expect(page.getByRole('heading', { name: 'Curva de aprendizado' })).toBeVisible()
  await expect(page.getByText('Esqueceu um pouco da fase 2')).toBeVisible()
  await expect(page.getByText(/aprendendo agora/)).toBeVisible()
})

test('glossário: busca sem acento', async ({ page }) => {
  await page.goto('/glossario')
  await page.getByPlaceholder('Buscar (ex.: VPD, mutação)').fill('mutacao')
  await expect(page.getByText('Mutação', { exact: false }).first()).toBeVisible()
})

test('tour do desenvolvedor aparece uma vez', async ({ page, isMobile }) => {
  test.skip(isMobile, 'o tour é do desktop')
  await page.goto('/dev')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Pular' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Estufas lado a lado' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('desktop: barra lateral recolhe, mostra o nome no hover e lembra a escolha', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no celular a navegação é a barra de abas')
  await page.goto('/')
  await page.getByRole('button', { name: 'Recolher a barra lateral' }).click()
  // recolhida: a lista de estufas some, os ícones ficam e dizem o nome no hover
  await expect(page.getByText('Campeão fase 3')).toHaveCount(0)
  await page.getByRole('link', { name: 'Histórico' }).hover()
  await expect(page.getByRole('tooltip', { name: 'Histórico' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Expandir a barra lateral' })).toBeVisible()
})

test('sol/lua alterna claro e escuro com um clique', async ({ page }) => {
  // "sistema" num aparelho claro: o primeiro clique vai para o escuro
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Usar tema escuro' }).click()
  await expect(page.getByRole('button', { name: 'Usar tema claro' })).toBeVisible()
  await page.getByRole('button', { name: 'Usar tema claro' }).click()
  await expect(page.getByRole('button', { name: 'Usar tema escuro' })).toBeVisible()
})
