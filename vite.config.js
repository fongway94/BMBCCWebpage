import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/BMBCCWebpage/', // Tells Vite that the site is hosted at github.io/BMBCCWebpage/
})
