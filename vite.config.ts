import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function stampServiceWorker(): Plugin {
  const buildId = Date.now().toString(36)
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      const contents = readFileSync(swPath, 'utf-8')
      writeFileSync(swPath, contents.replace(/__BUILD_ID__/g, buildId))
    },
  }
}

export default defineConfig(({ mode }) => {
  // Local server by default so `npm run dev` never touches production data.
  const proxyTarget = loadEnv(mode, process.cwd(), '').VITE_PROXY_TARGET || 'http://localhost:3001'
  return {
    plugins: [react(), stampServiceWorker()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      allowedHosts: ['end-to-end-sales-tool-production.up.railway.app']
    }
  }
})
