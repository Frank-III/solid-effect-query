import { createSignal, For, Show } from 'solid-js'
import { makeEffectRuntime } from 'solid-effect-query'
import { Effect, Layer } from 'effect'
import * as RpcClient from '@effect/rpc/RpcClient'
import * as RpcSerialization from '@effect/rpc/RpcSerialization'
import { FetchHttpClient } from '@effect/platform'
import { TasksRpc } from '../api/tasks.rpc'

// Create the RPC client layer properly with serialization
const tasksClientLayer = RpcClient.layerProtocolHttp({
  url: 'http://localhost:3001/rpc/tasks'
}).pipe(
  Layer.provide([
    FetchHttpClient.layer,
    RpcSerialization.layerJson
  ])
)

// Create runtime with the RPC client
const { Provider, useEffectQuery, useEffectMutation } = makeEffectRuntime(() => tasksClientLayer)

// Inner component that uses hooks
function RpcDemoContent() {
  const [newTodoTitle, setNewTodoTitle] = createSignal('')

  // Query for todos using the typed RPC client
  const todosQuery = useEffectQuery(() => ({
    queryKey: ['rpc-demo-todos'],
    queryFn: () => Effect.gen(function* () {
      const client = yield* RpcClient.make(TasksRpc, { flatten: true })
      return yield* client('getTasks', undefined)
    }).pipe(Effect.scoped),
    throwOnDefect: true,
  }))

  // Create todo mutation with proper typing
  const createTodoMutation = useEffectMutation(() => ({
    mutationFn: (title: string) =>
      Effect.gen(function* () {
        const client = yield* RpcClient.make(TasksRpc, { flatten: true })
        const result = yield* client('createTask', { title })
        // Refetch after successful create
        void todosQuery.refetch()
        setNewTodoTitle('')
        return result
      }).pipe(Effect.scoped),
    throwOnDefect: true,
  }))

  // Toggle todo mutation
  const toggleTodoMutation = useEffectMutation(() => ({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      Effect.gen(function* () {
        const client = yield* RpcClient.make(TasksRpc, { flatten: true })
        const result = yield* client('updateTask', { id, completed: !completed })
        // Refetch after successful update
        void todosQuery.refetch()
        return result
      }).pipe(Effect.scoped),
    throwOnDefect: true,
  }))

  // Delete todo mutation
  const deleteTodoMutation = useEffectMutation(() => ({
    mutationFn: (id: string) =>
      Effect.gen(function* () {
        const client = yield* RpcClient.make(TasksRpc, { flatten: true })
        const result = yield* client('deleteTask', { id })
        // Refetch after successful delete
        void todosQuery.refetch()
        return result
      }).pipe(Effect.scoped),
    throwOnDefect: true,
  }))

  const handleCreateTodo = (e: Event) => {
    e.preventDefault()
    const title = newTodoTitle().trim()
    if (title) {
      createTodoMutation.mutate(title)
    }
  }

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">RPC Demo with Type Safety</h2>
      
      <div class="mb-6 p-4 bg-purple-50 rounded">
        <p class="text-sm text-purple-800 mb-2">
          This demo shows proper typed RPC usage with Effect's RPC client.
          Unlike manual HTTP requests, this provides:
        </p>
        <ul class="list-disc list-inside text-sm text-purple-700 ml-2">
          <li>Full type safety for RPC methods and payloads</li>
          <li>Automatic serialization/deserialization</li>
          <li>Proper error handling with typed errors</li>
          <li>Built-in request/response validation</li>
        </ul>
        <p class="text-sm text-purple-600 mt-2">
          <strong>Note:</strong> Make sure the RPC server is running on port 3001.
        </p>
      </div>

      {/* Create Todo Form */}
      <form onSubmit={handleCreateTodo} class="mb-6">
        <div class="flex gap-2">
          <input
            type="text"
            value={newTodoTitle()}
            onInput={(e) => setNewTodoTitle(e.currentTarget.value)}
            placeholder="What needs to be done?"
            class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={createTodoMutation.isPending}
          />
          <button
            type="submit"
            disabled={createTodoMutation.isPending || !newTodoTitle().trim()}
            class="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {createTodoMutation.isPending ? 'Adding...' : 'Add Todo'}
          </button>
        </div>
      </form>

      {/* Todo List */}
      <Show
        when={!todosQuery.isPending}
        fallback={
          <div class="space-y-2">
            {[1, 2, 3].map(() => (
              <div class="animate-pulse flex items-center p-3 border rounded">
                <div class="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        }
      >
        <Show
          when={todosQuery.isSuccess}
          fallback={
            <div class="p-4 bg-red-50 text-red-600 rounded">
              <p class="font-medium">Error loading todos</p>
              <p class="text-sm mt-2">
                Make sure the RPC server is running on port 3001.
              </p>
              <Show when={todosQuery.error}>
                <pre class="text-xs mt-2 overflow-auto">
                  {JSON.stringify(todosQuery.error, null, 2)}
                </pre>
              </Show>
            </div>
          }
        >
          <div class="space-y-2">
            <For each={todosQuery.data || []}>
              {(todo) => (
                <div class="flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodoMutation.mutate({ id: todo.id, completed: todo.completed })}
                    class="w-5 h-5 cursor-pointer"
                    disabled={toggleTodoMutation.isPending}
                  />
                  <span class={todo.completed ? 'line-through text-gray-400 flex-1' : 'flex-1'}>
                    {todo.title}
                  </span>
                  <span class="text-xs text-gray-400">
                    {new Date(todo.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => deleteTodoMutation.mutate(todo.id)}
                    disabled={deleteTodoMutation.isPending}
                    class="px-3 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </For>
            <Show when={(todosQuery.data?.length || 0) === 0}>
              <p class="text-center text-gray-500 py-8">No todos yet. Create one above!</p>
            </Show>
          </div>
        </Show>
      </Show>

      {/* Features showcase */}
      <div class="mt-8 pt-6 border-t">
        <h3 class="font-medium mb-3">Features Demonstrated:</h3>
        <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>Type-safe RPC client from schema definitions</li>
          <li>Automatic request/response serialization</li>
          <li>Error handling with proper types</li>
          <li>Scoped resources for proper cleanup</li>
          <li>Full IntelliSense for RPC methods</li>
        </ul>
      </div>
    </div>
  )
}

// Export the main component wrapped with Provider
export function RpcDemo() {
  return (
    <Provider>
      <RpcDemoContent />
    </Provider>
  )
}