import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` → PWA instalable (GitHub Pages u otro hosting estático).
// `npm run build:single` → un solo index.html autocontenido, para abrirlo directo.
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: './',
    build: { outDir: single ? 'dist-single' : 'dist' },
    plugins: [
      react(),
      single
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'] },
            includeAssets: ['icon.svg'],
            manifest: {
              name: 'Kontrola — Finanzas personales',
              short_name: 'Kontrola',
              description: 'Registra tus gastos en segundos y controla tu presupuesto mensual.',
              lang: 'es-CL',
              start_url: './',
              scope: './',
              display: 'standalone',
              background_color: '#ffffff',
              theme_color: '#ffffff',
              icons: [
                { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
                { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
              ],
            },
          }),
    ],
    test: { environment: 'node' },
  }
})
