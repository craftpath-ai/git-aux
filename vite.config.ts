import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// In development the page comes from Vite and everything else from the git-aux server.
const GIT_AUX_SERVER_URL = 'http://127.0.0.1:4242'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': GIT_AUX_SERVER_URL,
      '/media': GIT_AUX_SERVER_URL,
    },
  },
})
