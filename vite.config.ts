import { createReadStream, existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Lector de fotos (OCR) alojado en la propia app: el worker, el motor y los idiomas se
 * sirven desde /ocr en vez de bajarse de un CDN externo. Así ningún código de terceros
 * se carga en tiempo de ejecución junto a los datos cifrados.
 * Solo se descargan cuando alguien usa la foto o importa una imagen (no se precargan).
 */
const OCR_FILES: Record<string, string> = {
  'worker.min.js': 'tesseract.js/dist/worker.min.js',
  'tesseract-core-lstm.wasm.js': 'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'lang/spa.traineddata.gz': '@tesseract.js-data/spa/4.0.0_best_int/spa.traineddata.gz',
  'lang/eng.traineddata.gz': '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
}
const ocrSource = (file: string) => resolve('node_modules', OCR_FILES[file])

function selfHostedOcr(): Plugin {
  let outDir = 'dist'
  return {
    name: 'kontrola-ocr',
    configResolved(config) {
      outDir = config.build.outDir
    },
    configureServer(server) {
      server.middlewares.use('/ocr/', (req, res, next) => {
        const file = (req.url ?? '').split('?')[0].replace(/^\//, '')
        if (!OCR_FILES[file] || !existsSync(ocrSource(file))) return next()
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
        createReadStream(ocrSource(file)).pipe(res)
      })
    },
    async writeBundle() {
      for (const file of Object.keys(OCR_FILES)) {
        const target = resolve(outDir, 'ocr', file)
        await mkdir(dirname(target), { recursive: true })
        await copyFile(ocrSource(file), target)
      }
    },
  }
}

// `npm run build` → PWA instalable (GitHub Pages u otro hosting estático).
// `npm run build:single` → un solo index.html autocontenido, para abrirlo directo.
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: './',
    build: { outDir: single ? 'dist-single' : 'dist' },
    plugins: [
      react(),
      single ? viteSingleFile() : selfHostedOcr(),
      single
        ? null
        : VitePWA({
            registerType: 'autoUpdate',
            workbox: { globPatterns: ['**/*.{js,css,html,png,webp,woff2}'], globIgnores: ['ocr/**'] },
            includeAssets: ['favicon.png', 'apple-touch-icon.png'],
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
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
          }),
    ],
    test: { environment: 'node' },
  }
})
