# SolidJS Effect Query

A collection of packages for integrating Effect-TS with TanStack Query in SolidJS applications.

## Packages

- **`solid-effect-query`** - Core hooks for Effect + TanStack Query integration
- **`solid-effect-query-http-api`** - HttpApi integration for Effect Platform
- **`solid-effect-query-rpc`** - RPC integration for Effect RPC

## Installation

```bash
pnpm add solid-effect-query @tanstack/solid-query effect
# For HttpApi support
pnpm add solid-effect-query-http-api @effect/platform
# For RPC support  
pnpm add solid-effect-query-rpc @effect/rpc @effect/rpc-http
```

## Quick Start

### Core Usage

```tsx
import { createEffectQuery, EffectRuntimeProvider } from 'solid-effect-query'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import * as Effect from 'effect'

const queryClient = new QueryClient()

// Define your Effect
const fetchUser = (id: string) => 
  Effect.gen(function* () {
    // Your Effect logic here
    return { id, name: 'John Doe' }
  })

function UserProfile() {
  const [userId] = createSignal('1')
  
  const query = createEffectQuery(() => ({
    queryKey: ['user', userId()],
    queryFn: () => fetchUser(userId()),
    enabled: userId().length > 0
  }))
  
  return (
    <Show when={query.data}>
      <div>{query.data.name}</div>
    </Show>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EffectRuntimeProvider runtime={runtime}>
        <UserProfile />
      </EffectRuntimeProvider>
    </QueryClientProvider>
  )
}
```

### HttpApi Usage

```tsx
import { HttpApi, HttpApiGroup, HttpApiEndpoint } from '@effect/platform'
import { createHttpApiClient, createHttpApiQuery } from 'solid-effect-query-http-api'

// Define your API
class UsersApi extends HttpApi.make("users")
  .add(
    HttpApiGroup.make("users")
      .add(HttpApiEndpoint.get("getUser", "/users/:id"))
  ) {}

// Create client
const client = createHttpApiClient(UsersApi, {
  baseUrl: 'https://api.example.com',
  runtime
})

// Use in component
function User() {
  const [userId] = createSignal('1')
  
  const query = createHttpApiQuery(
    client.users.getUser,
    () => ({
      queryKey: ['user', userId()],
      args: [{ params: { id: userId() } }]
    })
  )
  
  return <div>{query.data?.name}</div>
}
```

### RPC Usage

```tsx
import * as Rpc from '@effect/rpc/Rpc'
import * as RpcGroup from '@effect/rpc/RpcGroup'
import { createRpcClient, createRpcQuery } from 'solid-effect-query-rpc'

// Define RPC
class MyRpc extends RpcGroup.make(
  Rpc.make("getUser")
    .payload(Schema.Struct({ id: Schema.String }))
    .success(UserSchema)
) {}

// Create client
const rpcClient = createRpcClient(MyRpcClient, MyRpc, {
  url: 'http://localhost:3000/rpc',
  runtime
})

// Use in component
function User() {
  const [userId] = createSignal('1')
  
  const query = createRpcQuery(
    MyRpcClient,
    runtime,
    "getUser",
    () => ({
      queryKey: ['user', userId()],
      payload: { id: userId() }
    })
  )
  
  return <div>{query.data?.name}</div>
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run demo app
pnpm dev

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

## Demo App

Check out the `examples/demo-app` folder for a complete example demonstrating all three packages.

## Features

- ✅ Full Effect integration with TanStack Query
- ✅ Type-safe HttpApi client
- ✅ RPC support with automatic batching
- ✅ SolidJS reactive patterns
- ✅ Tree-shakeable packages
- ✅ TypeScript first
- ✅ Proper error handling with Effect's Cause