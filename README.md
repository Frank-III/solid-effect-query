# Solid Effect Query

A powerful integration of [Effect](https://effect.website/) with [TanStack Query](https://tanstack.com/query) for [SolidJS](https://www.solidjs.com/) applications, bringing functional programming patterns and type-safe error handling to your data fetching layer.

## 📦 Packages

This monorepo contains three packages that work together to provide a complete Effect + TanStack Query solution for SolidJS:

| Package | Description | Version |
|---------|-------------|---------|
| [solid-effect-query](./packages/solid-effect-query) | Core Effect integration with TanStack Query | 0.1.0 |
| [solid-effect-query-http-api](./packages/solid-effect-query-http-api) | Effect Platform HTTP API integration | 0.1.0 |
| [solid-effect-query-rpc](./packages/solid-effect-query-rpc) | Effect RPC client integration | 0.1.0 |

## 🚀 Quick Start

### Installation

```bash
# Core package
npm install solid-effect-query @tanstack/solid-query effect

# For HTTP API support
npm install solid-effect-query-http-api @effect/platform

# For RPC support
npm install solid-effect-query-rpc @effect/rpc @effect/rpc-http
```

### Basic Usage

```tsx
import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Layer } from "effect";
import { createSignal, Show } from "solid-js";

// Create a runtime with your services
const { Provider, useEffectQuery, useEffectMutation } = makeEffectRuntime(() => 
  Layer.empty // Add your services here
);

function App() {
  return (
    <Provider>
      <TodoList />
    </Provider>
  );
}

function TodoList() {
  const query = useEffectQuery(() => ({
    queryKey: ["todos"],
    queryFn: () => 
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: () => fetch("/api/todos").then(r => r.json()),
          catch: (error) => new Error(`Failed to fetch: ${error}`)
        });
        return response;
      })
  }));

  return (
    <div>
      <Show when={query.isPending}>
        <div>Loading...</div>
      </Show>
      <Show when={query.isError}>
        <div>Error: {query.error?.message}</div>
      </Show>
      <Show when={query.isSuccess}>
        <ul>
          {query.data.map(todo => (
            <li>{todo.title}</li>
          ))}
        </ul>
      </Show>
    </div>
  );
}
```

## ✨ Features

- 🎯 **Type-safe error handling** - Leverage Effect's powerful error management system
- 🔄 **Runtime management** - Manage Effect services and dependencies with SolidJS context
- 🌐 **HTTP API integration** - Type-safe API clients with schema validation
- 📡 **RPC support** - Seamless client-server communication with automatic batching
- 💪 **Full TanStack Query features** - Caching, mutations, optimistic updates, infinite queries, and more
- 🔒 **Compile-time safety** - Catch errors at build time, not runtime
- ⚡ **SolidJS reactive** - Built specifically for SolidJS's fine-grained reactivity

## 📚 Examples

### With Services and Dependencies

```tsx
import { Context, Layer, Effect } from "effect";
import { makeEffectRuntime } from "solid-effect-query";

// Define a service
class LoggerService extends Context.Tag("Logger")<
  LoggerService,
  { log: (message: string) => Effect.Effect<void> }
>() {}

// Create layer
const LoggerLive = Layer.succeed(
  LoggerService,
  { log: (message) => Effect.log(message) }
);

// Create runtime with the service
const { Provider, useEffectQuery } = makeEffectRuntime(() => LoggerLive);

function DataComponent() {
  const query = useEffectQuery(() => ({
    queryKey: ["data-with-logging"],
    queryFn: () =>
      Effect.gen(function* () {
        const logger = yield* LoggerService;
        yield* logger.log("Fetching data...");
        const data = yield* fetchData();
        yield* logger.log("Data fetched successfully");
        return data;
      })
  }));

  return <div>{/* render data */}</div>;
}
```

### HTTP API Client

```tsx
import { makeHttpApiQuery } from "solid-effect-query-http-api";
import { Schema } from "effect";
import * as HttpApi from "@effect/platform/HttpApi";

// Define your API schema
class TodosApi extends HttpApi.make("todos").pipe(
  HttpApi.add(
    HttpApi.get("list", "/todos").pipe(
      HttpApi.setSuccess(Schema.Array(TodoSchema))
    )
  )
) {}

// Use in component
function TodoList() {
  const query = makeHttpApiQuery(
    TodosApi,
    runtime,
    "list",
    () => ({ queryKey: ["todos"] })
  );

  return <div>{/* render todos */}</div>;
}
```

## 🛠️ Development

This project uses pnpm workspaces for managing the monorepo.

```bash
# Clone the repository
git clone https://github.com/Frank-III/solid-effect-query.git
cd solid-effect-query

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the demo application
pnpm dev --filter=demo-app

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Project Structure

```
solid-effect-query/
├── packages/
│   ├── solid-effect-query/           # Core package
│   ├── solid-effect-query-http-api/  # HTTP API integration
│   └── solid-effect-query-rpc/       # RPC integration
├── examples/
│   └── demo-app/                     # Demo application
└── docs/                              # Documentation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to:
- Update tests as appropriate
- Update documentation
- Follow the existing code style
- Add changeset for version management

## 📄 License

MIT © [Frank Wang](https://github.com/Frank-III)

## 🙏 Acknowledgments

- [Effect](https://effect.website/) - The standard library for TypeScript
- [TanStack Query](https://tanstack.com/query) - Powerful asynchronous state management
- [SolidJS](https://www.solidjs.com/) - A declarative, efficient, and flexible JavaScript library
- [effect-react-query](https://github.com/jessekelly881/effect-react-query) - Inspiration for this SolidJS version

## 🔗 Links

- [GitHub Repository](https://github.com/Frank-III/solid-effect-query)
- [NPM Package - Core](https://www.npmjs.com/package/solid-effect-query)
- [NPM Package - HTTP API](https://www.npmjs.com/package/solid-effect-query-http-api)
- [NPM Package - RPC](https://www.npmjs.com/package/solid-effect-query-rpc)
- [Effect Documentation](https://effect.website/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)