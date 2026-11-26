import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig(({ mode }) => {
  const api = (process.env.VITE_API ?? loadEnv(mode, '.', 'VITE_').VITE_API) === '1', proxy = api ? { '/api': process.env.API_URL ?? 'http://localhost:8080' } : undefined
  return {
    plugins: [react()], base: './', server: { proxy }, preview: { proxy },
    build: { target: 'es2022', chunkSizeWarningLimit: 1400, outDir: api ? 'dist-api' : 'dist', rollupOptions: { input: api ? ['index.html', 'admin.html'] : ['index.html'] } },
  }
})
