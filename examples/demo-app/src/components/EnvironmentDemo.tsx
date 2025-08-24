import { createSignal, For, Show } from 'solid-js'
import { makeEffectRuntime } from 'solid-effect-query'
import { Layer, Context } from 'effect'
import * as Effect from 'effect/Effect'
import { QueryClient } from '@tanstack/solid-query'

// Simple mock service for demo purposes
class EnvironmentService extends Context.Tag("EnvironmentService")<
  EnvironmentService,
  {
    healthCheck: () => Effect.Effect<{ status: string; timestamp: string }>
    getUser: (id: number) => Effect.Effect<{ id: number; name: string; email: string }>
    listUsers: () => Effect.Effect<Array<{ id: number; name: string; email: string }>>
    getConfig: (key: string) => Effect.Effect<string | undefined>
    setConfig: (key: string, value: string) => Effect.Effect<void>
    getAllConfigs: () => Effect.Effect<Array<{ key: string; value: string }>>
    log: (message: string, level: string) => Effect.Effect<void>
  }
>() {}

// Mock implementation
const mockConfigs = new Map<string, string>([
  ['api.url', 'https://api.example.com'],
  ['api.timeout', '5000'],
  ['app.name', 'Demo App']
])

const EnvironmentServiceLive = Layer.succeed(
  EnvironmentService,
  {
    healthCheck: () => Effect.succeed({ 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    }),
    
    getUser: (id: number) => Effect.succeed({ 
      id, 
      name: `User ${id}`, 
      email: `user${id}@example.com` 
    }),
    
    listUsers: () => Effect.succeed([
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com' }
    ]),
    
    getConfig: (key: string) => Effect.succeed(mockConfigs.get(key)),
    
    setConfig: (key: string, value: string) => Effect.sync(() => {
      mockConfigs.set(key, value)
    }),
    
    getAllConfigs: () => Effect.succeed(
      Array.from(mockConfigs.entries()).map(([key, value]) => ({ key, value }))
    ),
    
    log: (message: string, level: string) => 
      Effect.log(`[${level.toUpperCase()}] ${message}`)
  }
)

// Create runtime with the service
const { Provider, useEffectQuery, useEffectMutation } = makeEffectRuntime(() => EnvironmentServiceLive)

// Create a query client instance
const queryClient = new QueryClient()

export function EnvironmentDemo() {
  const [selectedUserId, setSelectedUserId] = createSignal<number>(1)
  const [newUserName, setNewUserName] = createSignal('')
  const [newUserEmail, setNewUserEmail] = createSignal('')
  const [configKey, setConfigKey] = createSignal('')
  const [configValue, setConfigValue] = createSignal('')
  const [logMessage, setLogMessage] = createSignal('')
  const [logLevel, setLogLevel] = createSignal<'info' | 'warn' | 'error'>('info')
  const [logs, setLogs] = createSignal<Array<{ timestamp: string; level: string; message: string }>>([])

  // Health check query
  const healthQuery = useEffectQuery(() => ({
    queryKey: ['health'],
    queryFn: () => Effect.gen(function* () {
      const service = yield* EnvironmentService
      return yield* service.healthCheck()
    })
  }))

  // User queries
  const userQuery = useEffectQuery(() => ({
    queryKey: ['user', selectedUserId()],
    queryFn: () => Effect.gen(function* () {
      const service = yield* EnvironmentService
      return yield* service.getUser(selectedUserId())
    }),
    enabled: () => selectedUserId() > 0
  }))

  const usersQuery = useEffectQuery(() => ({
    queryKey: ['users'],
    queryFn: () => Effect.gen(function* () {
      const service = yield* EnvironmentService
      return yield* service.listUsers()
    })
  }))

  // Config queries
  const configQuery = useEffectQuery(() => ({
    queryKey: ['config', configKey()],
    queryFn: () => Effect.gen(function* () {
      const service = yield* EnvironmentService
      return yield* service.getConfig(configKey())
    }),
    enabled: () => configKey().length > 0
  }))

  const allConfigsQuery = useEffectQuery(() => ({
    queryKey: ['configs'],
    queryFn: () => Effect.gen(function* () {
      const service = yield* EnvironmentService
      return yield* service.getAllConfigs()
    })
  }))

  // Mutations
  const createUserMutation = useEffectMutation(() => ({
    mutationFn: ({ name, email }: { name: string; email: string }) => 
      Effect.succeed({ id: Date.now(), name, email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setNewUserName('')
      setNewUserEmail('')
    }
  }))

  const setConfigMutation = useEffectMutation(() => ({
    mutationFn: ({ key, value }: { key: string; value: string }) => 
      Effect.gen(function* () {
        const service = yield* EnvironmentService
        yield* service.setConfig(key, value)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      queryClient.invalidateQueries({ queryKey: ['config', configKey()] })
    }
  }))

  const logMutation = useEffectMutation(() => ({
    mutationFn: ({ message, level }: { message: string; level: string }) =>
      Effect.gen(function* () {
        const service = yield* EnvironmentService
        yield* service.log(message, level)
        const timestamp = new Date().toISOString()
        setLogs(prev => [...prev, { timestamp, level, message }])
      }),
    onSuccess: () => {
      setLogMessage('')
    }
  }))

  const handleCreateUser = () => {
    if (newUserName() && newUserEmail()) {
      createUserMutation.mutate({ name: newUserName(), email: newUserEmail() })
    }
  }

  const handleSetConfig = () => {
    if (configKey() && configValue()) {
      setConfigMutation.mutate({ key: configKey(), value: configValue() })
    }
  }

  const handleLog = () => {
    if (logMessage()) {
      logMutation.mutate({ message: logMessage(), level: logLevel() })
    }
  }

  return (
    <Provider>
      <div class="p-6 max-w-6xl mx-auto space-y-6">
        <h1 class="text-3xl font-bold mb-8">Environment Services Demo</h1>

        {/* Health Status */}
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">System Health</h2>
          <Show when={healthQuery.isSuccess} fallback={<p>Loading health status...</p>}>
            <div class="bg-green-50 p-4 rounded">
              <p class="text-green-800">
                Status: {healthQuery.data?.status}
              </p>
              <p class="text-sm text-green-600">
                Last checked: {healthQuery.data?.timestamp}
              </p>
            </div>
          </Show>
        </div>

        {/* User Management */}
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">User Management</h2>
          
          <div class="grid md:grid-cols-2 gap-6">
            {/* User List */}
            <div>
              <h3 class="font-medium mb-2">All Users</h3>
              <Show when={usersQuery.isSuccess} fallback={<p>Loading users...</p>}>
                <div class="space-y-2">
                  <For each={usersQuery.data || []}>
                    {(user) => (
                      <div 
                        class="p-3 border rounded cursor-pointer hover:bg-gray-50"
                        classList={{ 'bg-blue-50 border-blue-300': selectedUserId() === user.id }}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <p class="font-medium">{user.name}</p>
                        <p class="text-sm text-gray-600">{user.email}</p>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
              
              {/* Create User Form */}
              <div class="mt-4 space-y-2">
                <h4 class="font-medium">Create New User</h4>
                <input
                  type="text"
                  placeholder="Name"
                  value={newUserName()}
                  onInput={(e) => setNewUserName(e.currentTarget.value)}
                  class="w-full px-3 py-2 border rounded"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUserEmail()}
                  onInput={(e) => setNewUserEmail(e.currentTarget.value)}
                  class="w-full px-3 py-2 border rounded"
                />
                <button
                  onClick={handleCreateUser}
                  disabled={!newUserName() || !newUserEmail() || createUserMutation.isPending}
                  class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>

            {/* User Details */}
            <div>
              <h3 class="font-medium mb-2">User Details</h3>
              <Show when={userQuery.isSuccess && userQuery.data} fallback={
                <p class="text-gray-500">Select a user to view details</p>
              }>
                <div class="p-4 bg-gray-50 rounded">
                  <p><span class="font-medium">ID:</span> {userQuery.data?.id}</p>
                  <p><span class="font-medium">Name:</span> {userQuery.data?.name}</p>
                  <p><span class="font-medium">Email:</span> {userQuery.data?.email}</p>
                </div>
              </Show>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Configuration</h2>
          
          <div class="grid md:grid-cols-2 gap-6">
            {/* Get/Set Config */}
            <div>
              <h3 class="font-medium mb-2">Get/Set Config</h3>
              <div class="space-y-2">
                <input
                  type="text"
                  placeholder="Config key (e.g., api.url)"
                  value={configKey()}
                  onInput={(e) => setConfigKey(e.currentTarget.value)}
                  class="w-full px-3 py-2 border rounded"
                />
                
                <Show when={configQuery.data !== undefined}>
                  <div class="p-3 bg-gray-50 rounded">
                    <p class="text-sm text-gray-600">Current value:</p>
                    <p class="font-mono">{configQuery.data || '(not set)'}</p>
                  </div>
                </Show>
                
                <input
                  type="text"
                  placeholder="New value"
                  value={configValue()}
                  onInput={(e) => setConfigValue(e.currentTarget.value)}
                  class="w-full px-3 py-2 border rounded"
                />
                
                <button
                  onClick={handleSetConfig}
                  disabled={!configKey() || !configValue() || setConfigMutation.isPending}
                  class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {setConfigMutation.isPending ? 'Saving...' : 'Set Config'}
                </button>
              </div>
            </div>

            {/* All Configs */}
            <div>
              <h3 class="font-medium mb-2">All Configurations</h3>
              <Show when={allConfigsQuery.isSuccess} fallback={<p>Loading configs...</p>}>
                <div class="space-y-2">
                  <For each={allConfigsQuery.data || []}>
                    {(config) => (
                      <div class="p-3 bg-gray-50 rounded">
                        <p class="font-mono text-sm">{config.key}</p>
                        <p class="text-gray-600">{config.value}</p>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>

        {/* Logging */}
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Logging</h2>
          
          <div class="grid md:grid-cols-2 gap-6">
            {/* Log Form */}
            <div>
              <h3 class="font-medium mb-2">Create Log Entry</h3>
              <div class="space-y-2">
                <textarea
                  placeholder="Log message"
                  value={logMessage()}
                  onInput={(e) => setLogMessage(e.currentTarget.value)}
                  class="w-full px-3 py-2 border rounded h-24"
                />
                
                <select
                  value={logLevel()}
                  onChange={(e) => setLogLevel(e.currentTarget.value as any)}
                  class="w-full px-3 py-2 border rounded"
                >
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
                
                <button
                  onClick={handleLog}
                  disabled={!logMessage() || logMutation.isPending}
                  class="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  {logMutation.isPending ? 'Logging...' : 'Send Log'}
                </button>
              </div>
            </div>

            {/* Log Stream */}
            <div>
              <h3 class="font-medium mb-2">Log Stream</h3>
              <div class="bg-black text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
                <Show when={logs().length > 0} fallback={
                  <p class="text-gray-500">No logs yet...</p>
                }>
                  <For each={logs()}>
                    {(log) => (
                      <div class="mb-1">
                        <span class="text-gray-500">[{log.timestamp}]</span>{' '}
                        <span class={`font-bold ${
                          log.level === 'error' ? 'text-red-400' : 
                          log.level === 'warn' ? 'text-yellow-400' : 
                          'text-green-400'
                        }`}>
                          [{log.level.toUpperCase()}]
                        </span>{' '}
                        {log.message}
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Provider>
  )
}