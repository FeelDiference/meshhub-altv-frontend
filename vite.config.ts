import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: './client',
  base: './', // Относительные пути для Alt:V
  resolve: {
    alias: {
      '@': resolve('./client/src'),
    },
  },
  build: {
    // Билдим в client/ (там же где script.js и модули)
    outDir: '../../altv-server/resources/meshhub/client',
    emptyOutDir: false, // НЕ очищаем - там script.js и модули
    // prebuild скрипт очистит только assets/
  },
  server: {
    port: 3000,
    host: true,
  },
})
