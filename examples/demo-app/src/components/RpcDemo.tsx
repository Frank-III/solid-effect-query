import { createSignal, For, Show } from 'solid-js'
import { makeEffectRuntime } from 'solid-effect-query'
import { Effect, Layer, Context } from 'effect'
import { FetchHttpClient, HttpClient, HttpBody } from '@effect/platform'

// Define Todo type
interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
  userId: string
}

// Create a simple RPC service
class SimpleRpcService extends Context.Tag("SimpleRpcService")<
  SimpleRpcService,
  {
    getTodos: () => Effect.Effect<Todo[], Error>
    createTodo: (title: string) => Effect.Effect<Todo, Error>
    toggleTodo: (id: string) => Effect.Effect<Todo, Error>
    deleteTodo: (id: string) => Effect.Effect<void, Error>
  }
>() {}

// Implementation of the RPC service
const SimpleRpcServiceLive = Layer.effect(
  SimpleRpcService,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    
    const callRpc = (method: string, params: any = {}) =>
      httpClient.post("http://localhost:3001/rpc/todos", {
        body: HttpBody.json({
          jsonrpc: "2.0",
          method,
          params,
          id: Date.now(),
        }),
        headers: {
          "x-user-id": "user1",
          "x-user-name": "Demo User",
        },
      }).pipe(
        Effect.flatMap((response) => response.json),
        Effect.map((data: any) => {
          if (data.error) {
            throw new Error(data.error.message)
          }
          return data.result
        }),
        Effect.mapError(() => new Error(`RPC call failed: ${method}`))
      )
    
    return SimpleRpcService.of({
      getTodos: () => callRpc('getTodos', { completed: undefined }),
      createTodo: (title: string) => callRpc('createTodo', { title, userId: 'user1' }),
      toggleTodo: (id: string) =>
        Effect.gen(function* () {
          const todos = yield* callRpc('getTodos', {})
          const todo = todos.find((t: Todo) => t.id === id)
          if (!todo) throw new Error('Todo not found')
          return yield* callRpc('updateTodo', { id, completed: !todo.completed })
        }),
      deleteTodo: (id: string) => callRpc('deleteTodo', { id }),
    })
  })
).pipe(Layer.provide(FetchHttpClient.layer))

// Create runtime
const { Provider, useEffectQuery, useEffectMutation } = makeEffectRuntime(() => SimpleRpcServiceLive)

export function RpcDemo() {
  const [newTodoTitle, setNewTodoTitle] = createSignal('')

  // Query for todos
  const todosQuery = useEffectQuery(() => ({
    queryKey: ['rpc-todos'],
    queryFn: () => Effect.gen(function* () {
      const service = yield* SimpleRpcService
      return yield* service.getTodos()
    }),
    throwOnDefect: true, // This will expose Error instead of Cause<Error>
  }))

  // Mutations
  const createTodoMutation = useEffectMutation(() => ({
    mutationFn: (title: string) =>
      Effect.gen(function* () {
        const service = yield* SimpleRpcService
        return yield* service.createTodo(title)
      }),
    onSuccess: () => {
      todosQuery.refetch()
      setNewTodoTitle('')
    },
    throwOnDefect: true,
  }))

  const toggleTodoMutation = useEffectMutation(() => ({
    mutationFn: (id: string) =>
      Effect.gen(function* () {
        const service = yield* SimpleRpcService
        return yield* service.toggleTodo(id)
      }),
    onSuccess: () => {
      todosQuery.refetch()
    },
    throwOnDefect: true,
  }))

  const deleteTodoMutation = useEffectMutation(() => ({
    mutationFn: (id: string) =>
      Effect.gen(function* () {
        const service = yield* SimpleRpcService
        return yield* service.deleteTodo(id)
      }),
    onSuccess: () => {
      todosQuery.refetch()
    },
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
    <Provider>
      <div class="p-6 max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8">RPC Demo with Effect</h1>
        
        <div class="mb-4 p-4 bg-blue-50 rounded">
          <p class="text-sm text-blue-800">
            This demo shows how to use Effect + RPC with solid-effect-query.
            Make sure the RPC server is running on port 3001 by running:
          </p>
          <pre class="mt-2 p-2 bg-blue-100 rounded text-xs">
            cd server && pnpm install && pnpm dev
          </pre>
        </div>

        {/* Create Todo Form */}
        <form onSubmit={handleCreateTodo} class="mb-8">
          <div class="flex gap-2">
            <input
              type="text"
              value={newTodoTitle()}
              onInput={(e) => setNewTodoTitle(e.currentTarget.value)}
              placeholder="What needs to be done?"
              class="flex-1 px-4 py-2 border rounded-lg"
              disabled={createTodoMutation.isPending}
            />
            <button
              type="submit"
              disabled={createTodoMutation.isPending || !newTodoTitle().trim()}
              class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {createTodoMutation.isPending ? 'Adding...' : 'Add Todo'}
            </button>
          </div>
        </form>

        {/* Todo List */}
        <Show
          when={!todosQuery.isPending}
          fallback={<div>Loading todos...</div>}
        >
          <Show
            when={todosQuery.isSuccess}
            fallback={
              <div class="p-4 bg-red-50 text-red-600 rounded">
                <p>Error loading todos.</p>
                <p class="text-sm mt-2">
                  Make sure the RPC server is running on port 3001.
                </p>
              </div>
            }
          >
            <div class="space-y-2">
              <For each={todosQuery.data || []}>
                {(todo) => (
                  <div class="flex items-center gap-3 p-3 bg-white border rounded-lg">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodoMutation.mutate(todo.id)}
                      class="w-5 h-5 cursor-pointer"
                      disabled={toggleTodoMutation.isPending}
                    />
                    <span class={todo.completed ? 'line-through text-gray-400 flex-1' : 'flex-1'}>
                      {todo.title}
                    </span>
                    <button
                      onClick={() => deleteTodoMutation.mutate(todo.id)}
                      disabled={deleteTodoMutation.isPending}
                      class="px-3 py-1 text-red-500 hover:bg-red-50 rounded"
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
      </div>
    </Provider>
  )
}