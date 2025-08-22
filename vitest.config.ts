import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'
import path from 'path'

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      'solid-effect-query': path.resolve(__dirname, './packages/solid-effect-query/src'),
      'solid-effect-query-http-api': path.resolve(__dirname, './packages/solid-effect-query-http-api/src'),
      'solid-effect-query-rpc': path.resolve(__dirname, './packages/solid-effect-query-rpc/src'),
    }
  }
})