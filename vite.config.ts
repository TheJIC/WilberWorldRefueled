import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any subpath (e.g. GitHub Pages).
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  preview: {
    host: '127.0.0.1',
    port: 4173
  },
  build: {
    chunkSizeWarningLimit: 2000
  }
});
