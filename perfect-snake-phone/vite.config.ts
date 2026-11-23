import { defineConfig } from 'vite';

export default defineConfig({
  base: '/games/perfect-snake/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});