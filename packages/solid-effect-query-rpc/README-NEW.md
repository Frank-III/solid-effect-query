# solid-effect-query-rpc

Clean RPC integration for SolidJS with Effect and TanStack Query.

## Installation

```bash
pnpm add solid-effect-query-rpc @effect/rpc @effect/platform
```

## Usage

### 1. Define your RPC methods

```typescript
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"

class TodoRpcs extends RpcGroup.make(
  Rpc.make("getTodo"),
  Rpc.make("listTodos"),
  Rpc.make("createTodo"),
  Rpc.make("updateTodo"),
  Rpc.make("deleteTodo")
) {}
```

### 2. Create the client tag and layer

```typescript
import * as Context from "effect/Context"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as Layer from "effect/Layer"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"

// Extract RPC types
type ExtractRpcs = typeof TodoRpcs extends RpcGroup.RpcGroup<infer A> ? A : never

// Create client tag
const TodoRpcClient = Context.GenericTag<{
  readonly client: RpcClient.RpcClient.Flat<ExtractRpcs>
}>("TodoRpcClient")

// Create client layer
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

// Create runtime
const runtime = ManagedRuntime.make(todoClientLayer)
```

### 3. Use in your components

There are two approaches:

#### Option A: Factory Pattern (Recommended)

```typescript
import { makeRpcHooks } from "solid-effect-query-rpc"

// Create hooks once
const { useRpcQuery, useRpcMutation } = makeRpcHooks(TodoRpcClient)

// Use in components
const TodoList: Component = () => {
  const [todoId, setTodoId] = createSignal(1)
  
  // Clean, type-safe API
  const todoQuery = useRpcQuery(
    "getTodo",
    () => ({ id: todoId() }),
    () => ({ staleTime: 5000 })
  )
  
  const createTodo = useRpcMutation("createTodo", () => ({
    onSuccess: (data) => {
      console.log("Created:", data)
    }
  }))
  
  return (
    <div>
      {todoQuery.data && <pre>{JSON.stringify(todoQuery.data)}</pre>}
      <button onClick={() => createTodo.mutate({ title: "New" })}>
        Create
      </button>
    </div>
  )
}
```

#### Option B: Direct Functions

```typescript
import { createRpcQuery, createRpcMutation } from "solid-effect-query-rpc"

const TodoList: Component = () => {
  const [todoId, setTodoId] = createSignal(1)
  
  const todoQuery = createRpcQuery(
    TodoRpcClient,
    "getTodo",
    () => ({ id: todoId() }),
    () => ({ staleTime: 5000 })
  )
  
  const createTodo = createRpcMutation(
    TodoRpcClient,
    "createTodo",
    () => ({ onSuccess: (data) => console.log("Created:", data) })
  )
  
  return (
    <div>
      {todoQuery.data && <pre>{JSON.stringify(todoQuery.data)}</pre>}
      <button onClick={() => createTodo.mutate({ title: "New" })}>
        Create
      </button>
    </div>
  )
}
```

### 4. Wrap with providers

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { EffectRuntimeProvider } from "solid-effect-query"

const App: Component = () => {
  const queryClient = new QueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <EffectRuntimeProvider runtime={runtime.runtime}>
        <TodoList />
      </EffectRuntimeProvider>
    </QueryClientProvider>
  )
}
```

## Key Features

- **Type-safe**: Full TypeScript inference for RPC methods, payloads, and responses
- **Reactive**: Queries automatically refetch when reactive dependencies change
- **Effect integration**: Seamlessly works with Effect's error handling and composition
- **Clean API**: Minimal boilerplate, follows established patterns
- **Two usage patterns**: Factory for cleaner component code, or direct functions for flexibility

## Differences from React version

This follows the same pattern as `effect-react-query-rpc` but adapted for SolidJS:

1. Uses `createSignal` and `Accessor` instead of React hooks
2. Uses `createEffectQuery` which handles runtime through provider
3. Reactive by default - queries re-run when signals change

## Migration from old API

If you were using the old API with `createRpcTag`/`createRpcLayer`:

```typescript
// Old way
const tag = createRpcTag("MyRpc", { group: MyRpcs, url: "..." })
const layer = createRpcLayer(tag)
const query = createRpcQueryLegacy(tag.tag, "method", () => ({ ... }))

// New way
const MyRpcClient = Context.GenericTag<{
  readonly client: RpcClient.RpcClient.Flat<ExtractRpcs>
}>("MyRpcClient")
const layer = Layer.scoped(MyRpcClient, ...)
const { useRpcQuery } = makeRpcHooks(MyRpcClient)
const query = useRpcQuery("method", () => ({ ... }))
```

The new API is cleaner, has better type inference, and follows Effect patterns more closely.