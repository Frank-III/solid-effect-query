import { defineConfig } from 'tsdown'
import solid from 'vite-plugin-solid'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  plugins: [solid()],
  clean: true,
  external: ['solid-js', '@tanstack/solid-query', 'effect'],
  dts: {
    build: true
  }
})