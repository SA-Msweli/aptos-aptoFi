import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
  },
  server: {
    open: true,
    proxy: {
      '/api/nodit': {
        target: 'https://aptos-testnet.nodit.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nodit/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Nodit proxy error:', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Proxying Nodit request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            const statusCode = proxyRes.statusCode;
            if (statusCode) {
              console.log('Nodit response status:', statusCode);
              if (statusCode >= 400) {
                console.log('Nodit error response headers:', proxyRes.headers);
              }
            }
          });
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend"),
    },
  },
});
