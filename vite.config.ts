import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
          animations: ['framer-motion']
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          let extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            extType = 'img';
          } else if (/woff|woff2/.test(extType || '')) {
            extType = 'css';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    open: true,
    host: true,
    // Proxy API requests to development server
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    open: true,
    host: true
  },
  // Optimize deps
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'framer-motion']
  }
})