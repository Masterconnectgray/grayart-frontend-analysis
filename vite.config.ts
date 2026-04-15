import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'serve' ? '/' : '/grayart/',
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3060',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-ui'
          }
          if (id.includes('node_modules/xlsx/')) {
            return 'vendor-xlsx'
          }
          if (id.includes('node_modules/@dnd-kit/')) {
            return 'vendor-dnd'
          }
        },
      },
    },
  },
}))
