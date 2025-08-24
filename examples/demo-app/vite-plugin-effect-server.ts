import type { Plugin, ViteDevServer } from 'vite'
import { isRunnableDevEnvironment } from 'vite'

interface EffectServerOptions {
  /**
   * Path to the server entry file
   */
  serverFile: string
  /**
   * Port for the Effect server (optional, defaults to 3001)
   */
  serverPort?: number
  /**
   * Whether to use the server environment API (Vite 6+)
   */
  useEnvironmentApi?: boolean
}

/**
 * Vite plugin for running an Effect server with HMR support
 * Inspired by MacroGraph's implementation
 */
export function effectServer(options: EffectServerOptions): Plugin {
  const {
    serverFile,
    serverPort = 3001,
    useEnvironmentApi = true
  } = options

  return {
    name: 'vite-plugin-effect-server',
    enforce: 'pre',
    
    config() {
      // Configure server environment for Vite 6+
      if (useEnvironmentApi) {
        return {
          environments: {
            server: {
              consumer: 'server',
              nodeCompatible: true,
              webCompatible: false,
              build: {
                ssr: true,
                rollupOptions: {
                  input: serverFile,
                  output: {
                    dir: './dist-server',
                    entryFileNames: 'index.mjs',
                  }
                },
                copyPublicDir: false,
                manifest: true,
                commonjsOptions: {
                  include: [/node_modules/],
                },
              },
              optimizeDeps: {
                include: [
                  'effect',
                  '@effect/platform',
                  '@effect/platform-node',
                  '@effect/rpc',
                  '@effect/schema'
                ],
              },
            },
          },
          builder: {
            sharedPlugins: true,
            async buildApp(builder) {
              const serverEnv = builder.environments['server']
              if (!serverEnv) throw new Error('Server environment not found')
              
              // Build server environment
              await builder.build(serverEnv)
            },
          },
        }
      }
      
      // Legacy configuration for older Vite versions
      return {}
    },

    async configureServer(viteServer: ViteDevServer) {
      // Use environment API if available (Vite 6+)
      if (useEnvironmentApi && viteServer.environments) {
        const serverEnv = viteServer.environments.server
        if (!serverEnv) {
          throw new Error('Server environment not found')
        }
        
        if (!isRunnableDevEnvironment(serverEnv)) {
          throw new Error('Server environment is not runnable')
        }

        console.log('🎭 Effect Server Plugin: Starting dev server...')
        
        try {
          // Import and run the server file
          await serverEnv.runner.import(serverFile).catch((e) => {
            console.error('❌ Failed to import server file:', e)
            throw e
          })
          
          console.log(`✅ Effect server started successfully`)
        } catch (error) {
          console.error('❌ Failed to start Effect server:', error)
          // Don't throw to allow Vite to continue
        }
      } else {
        // Legacy approach for older Vite versions
        console.log('⚠️  Using legacy server startup (consider upgrading to Vite 6+)')
        
        // We could spawn a subprocess here if needed
        // For now, we'll just log a warning
        console.log(`📝 Please run your server separately: node ${serverFile}`)
      }
    },
    
    // Handle build for production
    async buildEnd() {
      console.log('📦 Effect server build completed')
    },
  }
}