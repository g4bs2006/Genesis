import { test } from '@playwright/test'

/**
 * Capturas da revisão visual (anexadas ao PR de cada fase com tela).
 * Não roda no `npm run e2e` normal; só com:
 *   CAPTURAS=fase-0 npx playwright test capturas
 * Salva em docs/revisao-visual/<fase>/<projeto>-<tema>-<rota>.png
 */
const fase = process.env.CAPTURAS
const rotas = (process.env.ROTAS ?? '/,/ajustes,/dev,/visor').split(',')

test.skip(!fase, 'só roda com CAPTURAS=<fase>')

for (const tema of ['light', 'dark'] as const) {
  for (const rota of rotas) {
    test(`${tema} ${rota}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: tema })
      await page.goto(rota)
      await page.waitForLoadState('networkidle')
      const nome = rota === '/' ? 'agora' : rota.slice(1).replaceAll('/', '-')
      await page.screenshot({
        path: `../docs/revisao-visual/${fase}/${info.project.name}-${tema === 'light' ? 'claro' : 'escuro'}-${nome}.png`,
        fullPage: true,
      })
    })
  }
}
