# Solid Effect Query Demo App

This demo application showcases the capabilities of `solid-effect-query`, which integrates Effect-TS with TanStack Query in SolidJS applications.

## Running the Demo

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm run dev
```

The app will start with:
- Vite dev server on http://localhost:3000 (or 3001 if 3000 is busy)
- Effect HTTP server on http://localhost:3001

## Features Demonstrated

### 1. Todo List (Effect Services)
Shows how to use Effect services with solid-effect-query, including:
- Query data with Effect services
- Mutations with optimistic updates
- Error handling with Effect's error types

### 2. User Stats
Demonstrates:
- Parameterized queries
- Automatic refetching on parameter changes
- Loading states

### 3. Weather Service
Shows:
- Expected error handling (CityNotFound, NetworkError)
- The `throwOnDefect` option for error handling
- Retry configuration

### 4. Error Handling
Illustrates:
- Difference between expected errors and defects
- How `throwOnDefect` affects error exposure
- Effect.Cause wrapping when disabled

### 5. HTTP API
Demonstrates using Effect's HttpApi with solid-effect-query

### 6. Simple API
A basic example showing:
- Direct HTTP requests with Effect
- Using FetchHttpClient layer
- Simple query setup

## Key Concepts

### makeEffectRuntime
The demo uses `makeEffectRuntime` to create a runtime with services:

```typescript
const { Provider, useEffectQuery, useEffectMutation } = makeEffectRuntime(() => MainLayer)
```

### Effect Services
Services are defined using `Context.GenericTag` and implemented with layers:

```typescript
const TodoService = Context.GenericTag<TodoService>("TodoService")
const TodoServiceLive = Layer.succeed(TodoService, { /* implementation */ })
```

### Error Handling
- Expected errors (like "TodoNotFound") are part of the Effect type
- Defects are unexpected errors (thrown exceptions)
- `throwOnDefect: true` exposes only expected errors, defects throw
- `throwOnDefect: false` (default) wraps all errors in Effect.Cause

## Architecture

The demo follows a clean architecture pattern:
- Services define business logic interfaces
- Layers provide service implementations
- Components use hooks to access services
- All side effects are managed through Effect