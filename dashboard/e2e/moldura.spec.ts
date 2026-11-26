import { expect, test } from '@playwright/test'

test('produtor: abre no Agora com a frase de estado e o selo da reprodução', async ({ page }) => {
  await page.goto('/')
  // sem escolha na Vitrine: o campeão mais recente (controle automático)
  await expect(page.getByRole('heading', { level: 1, name: /na faixa|saiu da faixa/ })).toBeVisible()
  await expect(page.getByText(/^O controle automático cuida da estufa/)).toBeVisible()
  await expect(page.getByText(/^ciclo gravado no simulador · 1 h por segundo/)).toBeVisible()
  await expect(page.getByText('Lucro previsto do ciclo')).toBeVisible()
  // nada de jargão de treino no Produtor
  await expect(page.getByText(/agente|geração/i)).toHaveCount(0)
})

test('produtor: pausar a reprodução para o relógio', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Pausar' }).click()
  await expect(page.getByText(/^ciclo gravado no simulador · pausado/)).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText(/^ciclo gravado no simulador · 1 h por segundo/)).toBeVisible()
})

test('vitrine: escolher as regras fixas muda o que o Produtor vê, e a escolha fica salva', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'a Vitrine é do desktop')
  // só na primeira página: depois, a escolha da Vitrine fica no navegador
  await page.addInitScript(() => {
    if (!localStorage.getItem('genesis:preferencias'))
      localStorage.setItem('genesis:preferencias', JSON.stringify({ state: { tourDevVisto: true }, version: 0 }))
  })
  await page.goto('/dev/vitrine')
  await page.getByRole('button', { name: /^Regras fixas/ }).click()
  await page.goto('/')
  await expect(page.getByText(/^O termostato cuida da estufa/)).toBeVisible()
  await page.reload()
  await expect(page.getByText(/^O termostato cuida da estufa/)).toBeVisible()
})

test('ciclo: estágios e a curva da gravação, sem o histórico de alertas', async ({ page }) => {
  await page.goto('/ciclo')
  await expect(page.getByRole('heading', { level: 1, name: 'Ciclo' })).toBeVisible()
  await expect(page.getByText('Crescimento rápido')).toBeVisible()
  await expect(page.getByRole('img', { name: /Curva de crescimento/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /alertas/i })).toHaveCount(0)
})

test('navega pelas abas (celular) ou pela barra lateral (desktop)', async ({ page, isMobile }) => {
  await page.goto('/')
  const navegacao = isMobile ? page.getByRole('navigation', { name: 'Abas' }) : page.getByRole('navigation').first()
  await navegacao.getByRole('link', { name: 'Ciclo' }).click()
  await expect(page).toHaveURL(/\/ciclo$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Ciclo' })).toBeVisible()
})

test('trocar para Desenvolvedor leva às estufas lado a lado', async ({ page, isMobile }) => {
  // o seletor de modo mora na barra lateral (desktop) ou no topo da página (celular)
  await page.goto('/')
  await page.getByRole('radio', { name: 'Desenvolvedor' }).click()
  await expect(page).toHaveURL(/\/dev$/)
  if (!isMobile) await expect(page.getByRole('link', { name: 'Treino e gerações' })).toBeVisible()
})

test('desktop: Agora com os gráficos das últimas 24 horas', async ({ page, isMobile }) => {
  test.skip(isMobile, 'gráficos são do desktop')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Últimas 24 horas' })).toBeVisible()
  // no lugar do antigo "Agente × regras": quando colher
  await expect(page.getByText('Colheita', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'pH e EC' }).click()
  await expect(page.getByText('pH da solução')).toBeVisible()
})

test('histórico: período, alertas e CSV', async ({ page, isMobile }) => {
  test.skip(isMobile, 'histórico é do desktop')
  await page.goto('/historico')
  await expect(page.getByRole('heading', { name: 'Alertas do período' })).toBeVisible()
  await page.getByRole('radio', { name: 'Ciclo todo' }).click()
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

test('treino: curva de aprendizado, sem currículo nem "esqueceu"', async ({ page, isMobile }) => {
  test.skip(isMobile, 'treino detalhado é do desktop')
  await page.goto('/dev/treino')
  await expect(page.getByRole('heading', { name: 'Curva de aprendizado' })).toBeVisible()
  await expect(page.getByText('Currículo')).toHaveCount(0)
  await expect(page.getByText('Ele esqueceu algo?')).toHaveCount(0)
})

test('limpeza: nada de "?", glossário nem Agente × regras', async ({ page }) => {
  for (const rota of ['/', '/historico', '/ciclo', '/dinheiro', '/ajustes', '/dev/treino', '/dev/modelo']) {
    await page.goto(rota)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^O que é / })).toHaveCount(0)
    await expect(page.getByText(/Agente × regras|Glossário|perturbaç/i)).toHaveCount(0)
  }
  await page.goto('/glossario')
  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
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
