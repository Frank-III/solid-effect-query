# solid-effect-query

Integration between Effect and TanStack Query for SolidJS applications.

## Installation

```bash
npm install solid-effect-query effect @tanstack/solid-query
```

## Basic Usage

### Creating a Runtime with Layer.empty

The simplest way to get started is with an empty layer:

```typescript
import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Layer } from "effect";

const { Provider, useEffectQuery } = makeEffectRuntime(() => Layer.empty);

function App() {
  return (
    <Provider>
      <MyComponent />
    </Provider>
  );
}

function MyComponent() {
  const query = useEffectQuery(() => ({
    queryKey: ["data"],
    queryFn: () => Effect.succeed({ message: "Hello!" })
  }));
  
  return <div>{query.data?.message}</div>;
}
```

### Using Services

To use Effect services in your queries, provide them via layers:

```typescript
import { Effect, Layer, Context } from "effect";

// Define a service
class ApiService extends Context.Tag("ApiService")<
  ApiService,
  {
    getUser: (id: string) => Effect.Effect<User, Error>
  }
>() {}

// Implement the service
const ApiServiceLive = Layer.succeed(
  ApiService,
  ApiService.of({
    getUser: (id) => 
      Effect.tryPromise({
        try: () => fetch(`/api/users/${id}`).then(r => r.json()),
        catch: () => new Error("Failed to fetch user")
      })
  })
);

// Create runtime with the service
const { Provider, useEffectQuery } = makeEffectRuntime(() => ApiServiceLive);

// Use the service in queries
function UserProfile({ userId }: { userId: string }) {
  const query = useEffectQuery(() => ({
    queryKey: ["user", userId],
    queryFn: () => Effect.gen(function* () {
      const api = yield* ApiService;
      return yield* api.getUser(userId);
    })
  }));
  
  return <div>{query.data?.name}</div>;
}
```

## Common Layer Patterns

### ❌ Incorrect: Using incomplete layers directly

These will cause runtime errors:

```typescript
// ❌ DON'T DO THIS - Logger.pretty needs FiberRefs
const runtime1 = makeEffectRuntime(() => Logger.pretty);

// ❌ DON'T DO THIS - FetchHttpClient.layer needs platform setup  
const runtime2 = makeEffectRuntime(() => FetchHttpClient.layer);
```

### ✅ Correct: Using Layer.empty or complete layers

```typescript
// ✅ Simple empty layer
const runtime1 = makeEffectRuntime(() => Layer.empty);

// ✅ Complete service layer
const runtime2 = makeEffectRuntime(() => MyServiceLive);

// ✅ Composed layers
const runtime3 = makeEffectRuntime(() => 
  Layer.mergeAll(
    ConfigServiceLive,
    ApiServiceLive,
    DatabaseServiceLive
  )
);
```

## Type Safety

The library maintains full type safety. If your Effect requires a service that isn't provided in the runtime, TypeScript will catch it at compile time:

```typescript
const { Provider, useEffectQuery } = makeEffectRuntime(() => Layer.empty);

function MyComponent() {
  const query = useEffectQuery(() => ({
    queryKey: ["data"],
    queryFn: () => Effect.gen(function* () {
      // TypeScript error: ApiService is not in the runtime
      const api = yield* ApiService;
      return yield* api.getData();
    })
  }));
}
```

## API Reference

### `makeEffectRuntime`

Creates hooks and providers for a specific Effect runtime.

```typescript
function makeEffectRuntime<R, E, Args>(
  layer: (options: Args) => Layer.Layer<R, E>
): {
  Provider: ParentComponent<Args>;
  useEffectRuntime: () => ManagedRuntime.ManagedRuntime<R, E>;
  useEffectQuery: /* query hook */;
  useEffectMutation: /* mutation hook */;
}
```

### `useEffectQuery`

Query hook that runs Effects.

```typescript
const query = useEffectQuery(() => ({
  queryKey: ["key"],
  queryFn: () => Effect.Effect<Data, Error, Requirements>,
  // ... other TanStack Query options
}));
```

### `useEffectMutation`

Mutation hook that runs Effects.

```typescript
const mutation = useEffectMutation(() => ({
  mutationFn: (variables) => Effect.Effect<Data, Error, Requirements>,
  // ... other TanStack Query options
}));
```

## Troubleshooting

### "Cannot read properties of undefined (reading 'locals')"

This error occurs when using layers that have unmet dependencies. Common causes:

1. **Using `Logger.pretty` directly** - This layer requires FiberRefs which need proper setup
2. **Using `FetchHttpClient.layer` directly** - This requires platform-specific setup
3. **Using any layer with dependencies** without providing those dependencies

**Solution**: Use `Layer.empty` for simple cases, or properly compose your layers with all their dependencies.

### Type errors when using services

Ensure that:
1. Your service is properly provided in the layer passed to `makeEffectRuntime`
2. You're using the correct hook from the runtime (not mixing runtimes)
3. Your Effect's requirements match what's available in the runtime

## Advanced Patterns

### Dynamic Layer Arguments

```typescript
const { Provider, useEffectQuery } = makeEffectRuntime(
  ({ apiUrl }: { apiUrl: string }) => 
    Layer.succeed(Config, Config.of({ apiUrl }))
);

function App() {
  return (
    <Provider apiUrl="https://api.example.com">
      <MyComponent />
    </Provider>
  );
}
```

### Testing

For testing, provide mock implementations:

```typescript
const TestRuntime = makeEffectRuntime(() =>
  Layer.succeed(
    ApiService,
    ApiService.of({
      getUser: () => Effect.succeed(mockUser)
    })
  )
);
```

## License

MIT