import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { effectServer } from './vite-plugin-effect-server'

export default defineConfig({
  plugins: [
    solid(),
    effectServer({
      serverFile: './src/dev-server.ts',
      serverPort: 3001,
      useEnvironmentApi: true
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true
      },
      '/rpc': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})