import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/lua': {
        // PERBAIKAN DISINI: Pakai subdomain 'api' dan versi 'v1'
        target: 'https://api.luaobfuscator.com/v1/obfuscator', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lua/, ''),
        secure: false,
      },
    },
  },
});