import { Effect, Layer, Ref } from 'effect'
import { DatabaseService, ConfigService, LoggerService } from '../shared/environment-rpc'

// In-memory database implementation
let userIdCounter = 1
const usersDb = new Map<number, { id: number; name: string; email: string }>()

// Add some initial users
usersDb.set(1, { id: 1, name: "Alice", email: "alice@example.com" })
usersDb.set(2, { id: 2, name: "Bob", email: "bob@example.com" })
userIdCounter = 3

export const DatabaseServiceLive = Layer.succeed(
  DatabaseService,
  {
    getUser: (id: number) =>
      Effect.succeed(usersDb.get(id)).pipe(
        Effect.flatMap((user) => 
          user ? Effect.succeed(user) : Effect.die(new Error(`User with id ${id} not found`))
        )
      ),
    
    saveUser: (user: { name: string; email: string }) =>
      Effect.succeed({
        id: userIdCounter++,
        ...user
      }).pipe(
        Effect.tap((newUser) => Effect.sync(() => usersDb.set(newUser.id, newUser)))
      ),
    
    deleteUser: (id: number) =>
      Effect.sync(() => {
        if (!usersDb.has(id)) {
          throw new Error(`User with id ${id} not found`)
        }
        usersDb.delete(id)
      }),
    
    listUsers: () =>
      Effect.succeed(Array.from(usersDb.values()))
  }
)

// Configuration service implementation
export const ConfigServiceLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const configStore = yield* Ref.make<Record<string, string>>({
      "app.name": "Demo App",
      "app.version": "1.0.0",
      "api.timeout": "30000",
      "feature.darkMode": "true",
      "feature.analytics": "false"
    })
    
    return {
      getConfig: (key: string) =>
        Ref.get(configStore).pipe(
          Effect.flatMap((configs) => {
            const value = configs[key]
            return value !== undefined
              ? Effect.succeed(value)
              : Effect.die(new Error(`Config key ${key} not found`))
          })
        ),
      
      setConfig: (key: string, value: string) =>
        Ref.update(configStore, configs => ({
          ...configs,
          [key]: value
        })),
      
      getAllConfigs: () =>
        Ref.get(configStore)
    }
  })
)

// Logger service implementation
export const LoggerServiceLive = Layer.effect(
  LoggerService,
  Effect.gen(function* () {
    const logsRef = yield* Ref.make<Array<{ timestamp: Date; level: string; message: string }>>([])
    
    return {
      log: (level: "info" | "warn" | "error", message: string) =>
        Effect.gen(function* () {
          const entry = { timestamp: new Date(), level, message }
          yield* Ref.update(logsRef, logs => [...logs, entry])
          
          // Also log to console for visibility
          console.log(`[${level.toUpperCase()}] ${message}`)
        }),
      
      getLogs: () =>
        Ref.get(logsRef)
    }
  })
)

// Combined layer providing all services
export const EnvironmentServicesLive = Layer.mergeAll(
  DatabaseServiceLive,
  ConfigServiceLive,
  LoggerServiceLive
)