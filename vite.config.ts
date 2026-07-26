import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://eest-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://eest-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    allowedHosts: ['end-to-end-sales-tool-production.up.railway.app']
  }
})
