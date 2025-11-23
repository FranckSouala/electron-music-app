import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // Important for Electron to load assets
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
