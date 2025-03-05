import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const config = {
  plugins: [react()],
  base: './'
}

export default defineConfig(config)