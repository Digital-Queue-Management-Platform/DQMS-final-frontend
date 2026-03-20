import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import electron from "vite-plugin-electron/simple"
import path from "node:path"

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: {},
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: "es2018",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'react-router'
            if (id.includes('recharts')) return 'recharts'
            if (id.includes('framer-motion')) return 'framer-motion'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('react-icons')) return 'icons'
            return 'vendor'
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
