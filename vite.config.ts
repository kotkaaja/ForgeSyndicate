import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // 1. Proxy buat Obfuscator (tetap ke api luar)
      '/api/lua': {
        target: 'https://api.luaobfuscator.com/v1/obfuscator', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lua/, ''),
        secure: false,
      },
      // 2. Proxy buat Compiler (ARAHIN KE BACKEND LOKAL) -> TAMBAH INI
      '/api/compile': {
        target: 'http://localhost:3001', // Port backend lo
        changeOrigin: true,
        secure: false,
      },
    },
  },
});