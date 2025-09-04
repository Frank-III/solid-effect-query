# Demo App Architecture

This demo app showcases the three packages in the solid-effect-query ecosystem:

## Packages Demonstrated

### 1. `solid-effect-query` (Core Package)
- **Location**: `src/components/EffectQueryDemo.tsx`
- **Features**: 
  - Basic Effect integration with TanStack Query
  - `makeEffectRuntime` for managing Effect services with layers
  - `useEffectQuery` and `useEffectMutation` hooks
  - Direct HTTP requests using Effect's FetchHttpClient

### 2. `solid-effect-query-http-api`
- **Location**: `src/components/TodosHttpApi.tsx`
- **Features**:
  - Integration with Effect Platform's HTTP API
  - Type-safe API client generation
  - `makeHttpApiQuery` and `makeHttpApiMutation` hooks
  - Schema validation and error handling
- **API Definition**: `src/api/httpapi.ts`
- **Backend**: HTTP API endpoints served at `/api/*`

### 3. `solid-effect-query-rpc`
- **Location**: `src/components/RpcDemo.tsx`
- **Features**:
  - Effect RPC client integration
  - Full type safety from server to client
  - Automatic serialization/deserialization
  - Built-in error handling
- **API Definition**: `src/api/tasks.rpc.ts`
- **Backend**: RPC endpoint served at `/rpc/tasks`

## Backend Server (`dev-server.ts`)

The development server runs on port 3001 and provides:

- **HTTP API** (`/api/*`): RESTful endpoints for todos
- **RPC** (`/rpc/tasks`): RPC endpoint for task management
- **API Docs** (`/api/docs`): Scalar documentation for the HTTP API
- **Health Check** (`/health`): Server status endpoint

## Running the Demo

1. Start the backend server:
   ```bash
   pnpm run server
   ```

2. Start the frontend dev server:
   ```bash
   pnpm run dev
   ```

3. Open http://localhost:5173 in your browser

## Key Design Decisions

1. **Single Backend**: All three packages use the same backend server to demonstrate interoperability
2. **Clear Separation**: Each package has its own demo component with focused examples
3. **Type Safety**: Full type safety from backend API definitions to frontend hooks
4. **Single API Folder**: All API definitions are in `src/api/` for clarity

## File Structure

```
src/
├── api/                         # All API definitions
│   ├── httpapi.ts              # HTTP API schemas (todos, users)
│   └── tasks.rpc.ts            # RPC definitions for tasks
├── components/                  # Demo components for each package
│   ├── EffectQueryDemo.tsx     # solid-effect-query demo
│   ├── TodosHttpApi.tsx        # solid-effect-query-http-api demo
│   └── RpcDemo.tsx             # solid-effect-query-rpc demo
├── App.tsx                     # Main app with tab navigation
└── dev-server.ts               # Backend server serving both HTTP API and RPC
```

## What This Demo Shows

- **solid-effect-query**: How to use Effect services with TanStack Query, including error handling and loading states
- **solid-effect-query-http-api**: Type-safe HTTP API integration with automatic client generation from Effect HttpApi definitions
- **solid-effect-query-rpc**: Type-safe RPC communication with full type inference and error handling