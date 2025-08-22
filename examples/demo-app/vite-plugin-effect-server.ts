import type { Plugin } from 'vite'
import { isRunnableDevEnvironment } from 'vite'

interface EffectServerOptions {
  serverFile: string
  serverPort?: number
}

export function effectServer(options: EffectServerOptions): Plugin {
  return {
    name: 'vite-plugin-effect-server',
    
    config() {
      return {
        environments: {
          server: {
            nodeCompatible: true,
            webCompatible: false,
            build: {
              ssr: true,
              rollupOptions: {
                input: options.serverFile,
              },
              outDir: 'dist-server',
            },
            optimizeDeps: {
              include: ['effect', '@effect/platform', '@effect/platform-node'],
            },
          },
        },
      }
    },

    async configureServer(server) {
      const serverEnv = server.environments.server
      if (!serverEnv) {
        throw new Error('Server environment not found')
      }
      
      if (!isRunnableDevEnvironment(serverEnv)) {
        throw new Error('Server environment is not runnable')
      }

      console.log('🚀 Starting Effect server...')
      
      try {
        // Import and run the server file
        await serverEnv.runner.import(options.serverFile)
        console.log('✅ Effect server started')
      } catch (error) {
        console.error('❌ Failed to start Effect server:', error)
        throw error
      }
    },
  }
}