import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.API_TARGET || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Forward API calls to the headless nopCommerce, so no CORS setup is needed in development.
      // changeOrigin keeps the target host, which nopCommerce uses to determine the store.
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: false },
      },
    },
  }
})
