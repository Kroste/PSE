import { defineConfig } from 'vite';

export default defineConfig({
  base: '/PSE/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
