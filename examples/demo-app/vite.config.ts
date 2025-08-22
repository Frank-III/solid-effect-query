import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { effectServer } from './vite-plugin-effect-server'

export default defineConfig({
  plugins: [
    solid(),
    effectServer({
      serverFile: './src/server/basic.ts',
      serverPort: 3001
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/rpc': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})