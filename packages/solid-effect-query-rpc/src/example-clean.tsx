import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { makeEffectRuntime } from "solid-effect-query"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import type { Component } from "solid-js"
import { createSignal } from "solid-js"
import { makeRpcHooks, createRpcQuery, createRpcMutation } from "./rpc"

// Step 1: Define your RPC methods
class TodoRpcs extends RpcGroup.make(
  Rpc.make("getTodo"),
  Rpc.make("listTodos"),
  Rpc.make("createTodo"),
  Rpc.make("updateTodo"),
  Rpc.make("deleteTodo")
) {}

// Extract the RPC types for TypeScript
type ExtractRpcs = typeof TodoRpcs extends RpcGroup.RpcGroup<infer A> ? A : never

// Step 2: Create the client service tag
const TodoRpcClient = Context.GenericTag<{
  readonly client: RpcClient.RpcClient.Flat<ExtractRpcs>
}>("TodoRpcClient")

// Step 3: Create the client layer
const todoClientLayer = Layer.scoped(
  TodoRpcClient,
  Effect.map(
    RpcClient.make(TodoRpcs, { flatten: true }),
    (client) => ({ client })
  )
).pipe(
  Layer.provide(
    RpcClient.layerProtocolHttp({
      url: "http://localhost:3000/rpc"
    }).pipe(
      Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson])
    )
  )
)

// Step 4: Create the runtime using makeEffectRuntime
const runtime = makeEffectRuntime(() => todoClientLayer)

// Step 5: Create the hooks using the factory
const { useRpcQuery, useRpcMutation } = makeRpcHooks(TodoRpcClient, runtime.useEffectRuntime)

// Example component using the factory-created hooks
const TodoListWithFactory: Component = () => {
  const [todoId, setTodoId] = createSignal(1)
  
  // Clean API - types are inferred!
  const todoQuery = useRpcQuery(
    "getTodo",
    () => ({ id: todoId() }),
    () => ({
      staleTime: 5000,
      refetchOnWindowFocus: false
    })
  )
  
  const todosQuery = useRpcQuery(
    "listTodos",
    () => ({ limit: 10 }),
    () => ({
      refetchInterval: 30000
    })
  )
  
  const createTodo = useRpcMutation("createTodo", () => ({
    onSuccess: (data) => {
      console.log("Todo created:", data)
      todosQuery.refetch()
    }
  }))
  
  const updateTodo = useRpcMutation("updateTodo")
  const deleteTodo = useRpcMutation("deleteTodo")
  
  return (
    <div>
      <h2>Using Factory Pattern</h2>
      <button onClick={() => setTodoId(todoId() + 1)}>
        Next Todo (ID: {todoId() + 1})
      </button>
      
      {todoQuery.isLoading && <p>Loading todo...</p>}
      {todoQuery.data && (
        <div>
          <h3>Current Todo:</h3>
          <pre>{JSON.stringify(todoQuery.data, null, 2)}</pre>
        </div>
      )}
      
      <button onClick={() => createTodo.mutate({ title: "New Todo", completed: false })}>
        Create Todo
      </button>
    </div>
  )
}

// Alternative: Using direct functions without factory
const TodoListDirect: Component = () => {
  const [todoId, setTodoId] = createSignal(1)
  
  // Direct API - also clean!
  const todoQuery = createRpcQuery(
    TodoRpcClient,
    "getTodo",
    () => ({ id: todoId() }),
    runtime.useEffectRuntime,
    () => ({
      staleTime: 5000
    })
  )
  
  const createTodo = createRpcMutation(
    TodoRpcClient,
    "createTodo",
    runtime.useEffectRuntime,
    () => ({
      onSuccess: (data) => {
        console.log("Todo created:", data)
      }
    })
  )
  
  return (
    <div>
      <h2>Using Direct Functions</h2>
      <button onClick={() => setTodoId(todoId() + 1)}>
        Next Todo (ID: {todoId() + 1})
      </button>
      
      {todoQuery.data && (
        <pre>{JSON.stringify(todoQuery.data, null, 2)}</pre>
      )}
      
      <button onClick={() => createTodo.mutate({ title: "New Todo", completed: false })}>
        Create Todo
      </button>
    </div>
  )
}

// App component with providers - No need for EffectRuntimeProvider anymore!
const App: Component = () => {
  const queryClient = new QueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <runtime.Provider>
        <div>
          <h1>RPC Example</h1>
          <TodoListWithFactory />
          <hr />
          <TodoListDirect />
        </div>
      </runtime.Provider>
    </QueryClientProvider>
  )
}

export default App