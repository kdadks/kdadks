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
        manualChunks: (id) => {
          // Core React and Router - keep lucide-react with vendor to ensure React is loaded first
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/react-router-dom')) {
            return 'vendor';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
          
          // UI Libraries that depend on React
          if (id.includes('node_modules/framer-motion')) {
            return 'ui-libs';
          }
          
          // PDF and Document handling
          if (id.includes('html2canvas') || id.includes('jspdf')) {
            return 'pdf-utils';
          }
          
          // Rich Text Editor
          if (id.includes('react-quill') || id.includes('quill')) {
            return 'editor';
          }
          
          // Keep admin modules together to prevent React context issues
          if (id.includes('src/components/admin/')) {
            return 'admin';
          }
          if (id.includes('src/components/invoice/')) {
            return 'admin';
          }
          if (id.includes('src/components/contract/')) {
            return 'admin';
          }
          if (id.includes('src/components/quote/')) {
            return 'admin';
          }
          
          // Employee portal
          if (id.includes('src/components/employee/')) {
            return 'employee';
          }
          
          // Payment gateway
          if (id.includes('src/components/payment/')) {
            return 'payment';
          }
          
          // Services
          if (id.includes('src/services/')) {
            return 'services';
          }
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
    // Optimize chunk size - increased from 1000 to 1500 after implementing comprehensive code splitting
    // The contract module with rich text editor is inherently large
    chunkSizeWarningLimit: 1500
  },
  server: {
    port: 3001,
    strictPort: true, // Fail if port 3001 is in use instead of picking another
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