import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Notebook-BOM-Verification/' : '/',
  plugins: [react()],
  build: {
    outDir: 'docs',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
}))
