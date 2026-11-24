import { defineConfig, devices } from '@playwright/test'

// Playwright abre um navegador de verdade, clica e confere a tela.
// Dois tamanhos sempre: desktop e celular (Pixel 7).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    // sem animação: o teste não espera movimento
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // modo demo: dados de exemplo, sem depender de simulador nem backend
    command: 'npx vite build --mode demo && npx vite preview --mode demo --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
