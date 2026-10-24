import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // In the production build, files are served by Django under /static/,
  // so every asset link in index.html must start with /static/.
  // During `npm run dev` they're served from the root as usual.
  base: command === 'build' ? '/static/' : '/',
  server: {
    // During `npm run dev`, send /api requests on to Django (running on port 8000),
    // so React can call the API as if both were on the same server.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
}))
