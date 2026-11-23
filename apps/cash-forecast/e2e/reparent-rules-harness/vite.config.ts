import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const dir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: dir,
  plugins: [viteReact(), tailwindcss()],
  resolve: {
    alias: {
      '@app': path.resolve(dir, '../../src'),
    },
  },
  server: {
    port: 5199,
    strictPort: true,
  },
})