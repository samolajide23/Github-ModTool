import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const clientDir = path.dirname(fileURLToPath(import.meta.url));

/** Local mock dashboard — no Devvit / Reddit required */
export default defineConfig({
  root: path.join(clientDir, 'src/client'),
  plugins: [react()],
  resolve: {
    alias: {
      '@devvit/web/client': path.join(clientDir, 'src/client/devvit-client-stub.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: '../../dist/demo-local',
    emptyOutDir: true,
    rollupOptions: {
      input: 'demo-local.html',
    },
  },
});
