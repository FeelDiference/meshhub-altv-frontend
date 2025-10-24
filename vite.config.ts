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
    // Билдим сразу в правильную папку ALT:V сервера
    outDir: '../../altv-server/resources/meshhub/client',
    emptyOutDir: true, // Автоматически очищает старые файлы перед каждой сборкой
  },
  server: {
    port: 3000,
    host: true,
  },
})
