import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
   preview: {
    allowedHosts: ['end-to-end-sales-tool-production.up.railway.app']
  plugins: [react()],
})
