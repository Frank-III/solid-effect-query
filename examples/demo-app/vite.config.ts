import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { effectServer } from './vite-plugin-effect-server'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    solid(),
    effectServer({
      serverFile: './src/dev-server.ts',
      serverPort: 3001,
      useEnvironmentApi: true
    })
  ],
  resolve: {
    alias: {
      'solid-effect-query': resolve(__dirname, '../../packages/solid-effect-query/dist/index.js'),
      'solid-effect-query-http-api': resolve(__dirname, '../../packages/solid-effect-query-http-api/dist/index.js'),
      'solid-effect-query-rpc': resolve(__dirname, '../../packages/solid-effect-query-rpc/dist/index.js')
    }
  },
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