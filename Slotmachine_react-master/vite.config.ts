import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const stylesDir = path.resolve(__dirname, 'src/assets/styles')

export default defineConfig({
  base: '/games/slot-machine/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: [stylesDir],
        loadPaths: [stylesDir],
        additionalData: (content: string, filename: string) => {
          // Evita reimportar as parciais dentro delas mesmas.
          const normalized = filename.replace(/\\/g, '/')
          if (normalized.includes('/assets/styles/')) return content
          const prefix = [
            `@import "${stylesDir.replace(/\\/g, '/')}/_breakpoints.scss";`,
            `@import "${stylesDir.replace(/\\/g, '/')}/_fonts.scss";`,
            `@import "${stylesDir.replace(/\\/g, '/')}/_game.scss";`,
            `@import "${stylesDir.replace(/\\/g, '/')}/_theme-colors.scss";`,
          ].join('\n')
          return `${prefix}\n${content}`
        },
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, '../app/public/games/slot-machine'),
    emptyOutDir: true,
  },
})
