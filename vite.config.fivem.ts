import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Vite config для сборки под FiveM
export default defineConfig({
  plugins: [react()],
  root: './client',
  base: './', // Относительные пути для FiveM NUI
  resolve: {
    alias: {
      '@': resolve('./client/src'),
    },
  },
  build: {
    // Билдим в FiveM ресурс
    outDir: '../../FIVEM_2/txData/CFXDefault_6E2ECF.base/resources/meshhub-fivem/html',
    emptyOutDir: false, // НЕ очищаем всю папку (index.html уже там)
    assetsDir: 'assets', // assets/ внутри html/
  },
  server: {
    port: 3000,
    host: true,
  },
})

