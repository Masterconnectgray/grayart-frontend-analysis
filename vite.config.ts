import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/grayart/',
  server: {
    proxy: {
      '/api/evolution': {
        target: 'http://76.13.67.179:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/evolution/, ''),
      },
      '/flow': {
        target: 'https://www.flowgray.com.br',
        changeOrigin: true,
        secure: true,
      },
    },
  },
}))
