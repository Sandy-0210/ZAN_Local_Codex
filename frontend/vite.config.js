import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_SERVER = process.env.VITE_API_URL || 'http://localhost:5050'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': API_SERVER,
      '/health': API_SERVER,
    },
  },
})
