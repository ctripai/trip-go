import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Build into Next.js public/chat so it is served at /chat
export default defineConfig({
  base: '/chat/',
  plugins: [vue()],
  build: {
    outDir: resolve(__dirname, '../public/chat'),
    emptyOutDir: true
  }
})
