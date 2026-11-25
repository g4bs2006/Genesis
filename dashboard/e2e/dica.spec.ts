/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * O "o que é isso?" (ⓘ). O defeito do passo 07 era de cor: a dica abria, mas o
 * texto saía preto sobre o balão preto. Aqui: abre e fecha (mouse, teclado,
 * toque) e a letra contrasta com o fundo do balão, nos dois temas.
 */

/** Contraste WCAG entre a cor da 1ª linha da dica aberta e o fundo do balão. */
async function contrasteDaDica(page: Page) {
  return page.evaluate(() => {
    const balao = [...document.querySelectorAll('[role=tooltip]')].find((t) => t.matches(':popover-open'))!
    const letra = balao.querySelector('.astryx-text') ?? balao
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
    const lum = (c: string) => {
      const [r, g, b] = rgb(c).map((v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const a = lum(getComputedStyle(letra).color)
    const b = lum(getComputedStyle(balao).backgroundColor)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
}

for (const tema of ['light', 'dark'] as const) {
  test(`dica abre e fecha e é legível (${tema})`, async ({ page, isMobile }) => {
    await page.emulateMedia({ colorScheme: tema })
    await page.goto('/')
    const botao = page.getByRole('button', { name: /^O que é / }).first()
    const aberta = page.locator('[role=tooltip]:popover-open')

    if (isMobile) {
      // toque abre; toque longe fecha
      await botao.tap()
      await expect(aberta).toHaveCount(1)
      expect(await contrasteDaDica(page)).toBeGreaterThanOrEqual(4.5)
      await page.touchscreen.tap(360, 120)
      await expect(aberta).toHaveCount(0)
      return
    }

    // mouse: passar por cima mostra; clicar fixa; Esc fecha
    await botao.hover()
    await expect(aberta).toHaveCount(1)
    expect(await contrasteDaDica(page)).toBeGreaterThanOrEqual(4.5)
    await botao.click()
    await expect(botao).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(aberta).toHaveCount(0)

    // teclado: Enter fixa, Esc fecha
    await botao.focus()
    await page.keyboard.press('Enter')
    await expect(botao).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(botao).toHaveAttribute('aria-expanded', 'false')
  })
}
