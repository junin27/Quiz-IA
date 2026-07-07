/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600, // Silencia avisos de pacotes grandes no console
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/tests/setup.ts',
  },
})
