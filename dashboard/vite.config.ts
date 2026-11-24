import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// PWA (Progressive Web App): o site vira um app instalável no celular e no
// desktop. O plugin gera o manifesto (nome, ícones, cores) e o service worker,
// um script que guarda os arquivos do app para ele abrir mesmo sem internet.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt": o app avisa que há versão nova e o usuário decide quando atualizar
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Genesis',
        short_name: 'Genesis',
        description: 'A estufa de alface controlada por uma rede neural: o agora, o ciclo e o dinheiro.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // sem travar a orientação: o visor roda deitado numa TV ou tablet
        background_color: '#f5f5f5',
        theme_color: '#f5f5f5',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Agora', url: '/' },
          { name: 'Visor da estufa', url: '/visor' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // as gravações (~300 KB cada) só baixam quando abertas, não no precache
        // nem as fontes de alfabetos que o app em português não usa
        globIgnores: ['**/gravacao-*', '**/*-{cyrillic,cyrillic-ext,vietnamese,symbols2,greek,greek-ext}-*'],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
