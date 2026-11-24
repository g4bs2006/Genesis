import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // o fuso do app é America/Sao_Paulo, mas os testes fixam UTC para não
    // depender do relógio de quem roda (máquina do Gabriel ou o CI)
    env: { TZ: 'UTC' },
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
