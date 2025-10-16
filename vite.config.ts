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
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true,
  },
})
