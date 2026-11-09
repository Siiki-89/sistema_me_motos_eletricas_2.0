import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist/web', emptyOutDir: true },
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: { '/api': {
      target: 'http://127.0.0.1:4317', changeOrigin: true,
      configure(proxy) {
        proxy.on('proxyReq', (request, original) => {
          // Only the development page may use the same-origin API proxy.
          if (original.headers.origin === 'http://127.0.0.1:5173') {
            request.setHeader('origin', 'http://127.0.0.1:4317');
          }
        });
      },
    } },
  },
});
