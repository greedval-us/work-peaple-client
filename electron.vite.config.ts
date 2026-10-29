import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electron-vite'

const productionCsp = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "frame-src 'none'"
].join('; ')

const developmentCsp = productionCsp
  .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
  .replace("connect-src 'none'", "connect-src 'self' ws://localhost:* ws://127.0.0.1:* ws://[::1]:*")

export default defineConfig(({ command }) => ({
  main: {
    build: {
      rolldownOptions: {
        input: resolve('src/main/index.ts'),
        output: { format: 'cjs', entryFileNames: 'index.cjs' }
      }
    }
  },
  preload: {
    build: {
      externalizeDeps: false,
      rolldownOptions: {
        input: resolve('src/preload/index.ts'),
        output: { format: 'cjs', entryFileNames: 'index.cjs', codeSplitting: false }
      }
    }
  },
  renderer: {
    plugins: [
      vue(),
      {
        name: 'work-people-csp',
        transformIndexHtml: (html) => html.replace('__APP_CSP__', command === 'serve' ? developmentCsp : productionCsp)
      }
    ],
    server: { host: '127.0.0.1' },
    build: { rolldownOptions: { input: resolve('src/renderer/index.html') } }
  }
}))
