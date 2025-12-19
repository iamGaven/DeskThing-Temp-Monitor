import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    
    // Copy server executable to dist folder during build
    viteStaticCopy({
      targets: [
        {
          src: 'server/*',
          dest: 'server'
        }
      ]
    })
  ]
})