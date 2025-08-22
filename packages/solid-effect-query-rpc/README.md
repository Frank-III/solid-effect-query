# solid-effect-query-rpc

RPC support for solid-effect-query using @effect/rpc

## Installation

```bash
pnpm add solid-effect-query-rpc @effect/rpc
```

## Usage

### Using the Factory Pattern (Recommended)

The factory pattern provides hooks that work with your RPC client:

```tsx
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { makeEffectRuntime } from "solid-effect-query"
import { makeRpcHooks } from "solid-effect-query-rpc"

// 1. Define your RPC methods
class UserRpcs extends RpcGroup.make(
  Rpc.make("getUser"),
  Rpc.make("createUser"),
  Rpc.make("updateUser"),
  Rpc.make("deleteUser")
) {}

// Extract RPC types
type ExtractRpcs = typeof UserRpcs extends RpcGroup.RpcGroup<infer A> ? A : never

// 2. Create client service tag
const UserRpcClient = Context.GenericTag<{
  readonly client: RpcClient.RpcClient.Flat<ExtractRpcs>
}>("UserRpcClient")

// 3. Create client layer
const userClientLayer = Layer.scoped(
  UserRpcClient,
  Effect.map(
    RpcClient.make(UserRpcs, { flatten: true }),
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

// 4. Create runtime
const runtime = makeEffectRuntime(() => userClientLayer)

// 5. Create hooks
const { useRpcQuery, useRpcMutation } = makeRpcHooks(UserRpcClient, runtime.useEffectRuntime)

// 6. Use in components
function UserProfile(props: { userId: number }) {
  const userQuery = useRpcQuery(
    "getUser",
    () => ({ id: props.userId }),
    () => ({
      staleTime: 5000,
      refetchOnWindowFocus: false
    })
  )
  
  const updateUser = useRpcMutation("updateUser", () => ({
    onSuccess: (data) => {
      console.log("User updated:", data)
      userQuery.refetch()
    }
  }))
  
  return (
    <div>
      {userQuery.data && (
        <div>
          <h1>{userQuery.data.name}</h1>
          <p>{userQuery.data.email}</p>
        </div>
      )}
      
      <button onClick={() => updateUser.mutate({ 
        id: props.userId, 
        name: "Updated Name" 
      })}>
        Update User
      </button>
    </div>
  )
}

// 7. Wrap app with providers
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <runtime.Provider>
        <UserProfile userId={1} />
      </runtime.Provider>
    </QueryClientProvider>
  )
}
```

### Alternative: Direct Functions

You can also use the RPC functions directly without the factory:

```tsx
import { createRpcQuery, createRpcMutation } from "solid-effect-query-rpc"

function UserProfile(props: { userId: number }) {
  const userQuery = createRpcQuery(
    UserRpcClient,
    "getUser",
    () => ({ id: props.userId }),
    runtime.useEffectRuntime,
    () => ({ staleTime: 5000 })
  )
  
  const updateUser = createRpcMutation(
    UserRpcClient,
    "updateUser",
    runtime.useEffectRuntime,
    () => ({
      onSuccess: (data) => {
        console.log("User updated:", data)
      }
    })
  )
  
  // ... rest of component
}
```

## With Schema Validation

For type-safe RPC with schema validation:

```tsx
import * as Schema from "@effect/schema/Schema"

// Define schemas
const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String
})

const GetUserPayload = Schema.Struct({
  id: Schema.Number
})

// Define RPC methods with schemas
class UserRpcs extends RpcGroup.make(
  Rpc.make("getUser", {
    payload: GetUserPayload,
    success: User,
    error: Schema.String
  }),
  Rpc.make("createUser", {
    payload: Schema.Struct({
      name: Schema.String,
      email: Schema.String
    }),
    success: User,
    error: Schema.String
  })
) {}
```

## Testing

For testing, use `RpcTest.makeClient` with mock handlers:

```tsx
import * as RpcTest from "@effect/rpc/RpcTest"

const mockHandlers = {
  getUser: ({ id }: { id: number }) =>
    Effect.succeed({ 
      id, 
      name: "Test User", 
      email: "test@example.com" 
    }),
  createUser: (input: { name: string; email: string }) =>
    Effect.succeed({ 
      id: 123, 
      ...input 
    })
}

// Create test layer
const testLayer = Layer.scoped(
  UserRpcClient,
  Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(UserRpcs, { flatten: true }).pipe(
      Effect.provide(UserRpcs.toLayer(mockHandlers))
    )
    return { client }
  })
)

// Create test runtime
const testRuntime = makeEffectRuntime(() => testLayer)
```

## Key Features

- **Type Safety**: Full type inference for payloads, responses, and errors
- **Effect Integration**: Seamlessly works with Effect's ecosystem
- **Error Handling**: Errors are wrapped in Effect's Cause type
- **React Query Features**: Access to all React Query features like caching, refetching, etc.
- **Schema Validation**: Optional schema validation for runtime type safety

## API Reference

### `makeRpcHooks(clientTag, useEffectRuntime)`

Creates RPC query and mutation hooks for a given client tag.

Returns:
- `useRpcQuery(tag, payload, options?)` - Create an RPC query
- `useRpcMutation(tag, options?)` - Create an RPC mutation

### `createRpcQuery(clientTag, tag, payload, useEffectRuntime, options?)`

Create an RPC query directly without the factory pattern.

### `createRpcMutation(clientTag, tag, useEffectRuntime, options?)`

Create an RPC mutation directly without the factory pattern.