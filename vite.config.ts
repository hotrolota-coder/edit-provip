
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Safely expose API_KEY. If it doesn't exist in .env, default to an empty string.
      // This prevents "process is not defined" errors in the browser.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "")
    }
  }
})
