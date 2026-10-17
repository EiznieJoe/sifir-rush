import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// ID build (commit + masa) dipaparkan di skrin utama supaya senang sahkan versi mana yang dimuat
let sha = 'dev'
try {
  sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
} catch {
  /* bukan repo git */
}
const stamp = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(5, 16).replace('T', ' ')

// base './' supaya jalan di GitHub Pages (https://nama.github.io/nama-repo/)
export default defineConfig({
  plugins: [react()],
  base: './',
  define: { __BUILD__: JSON.stringify(`${sha} · ${stamp} MYT`) },
  build: { chunkSizeWarningLimit: 1500 },
})
