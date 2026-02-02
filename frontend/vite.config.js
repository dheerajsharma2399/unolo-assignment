import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9006,
    proxy: {
      '/api': {
        target: 'http://localhost:9007',
        changeOrigin: true
      }
    }
  },
  build: {
    // Disable caching for built assets
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  // Ensure fresh builds
  cacheDir: 'node_modules/.vite'
})
