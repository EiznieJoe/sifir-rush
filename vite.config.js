import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' supaya jalan di GitHub Pages (https://nama.github.io/nama-repo/)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
})
