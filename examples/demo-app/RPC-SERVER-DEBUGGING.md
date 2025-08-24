# RPC Server Debugging Summary

## The Problem
We're trying to create an Effect RPC server that runs as part of a Vite plugin, but the server never actually binds to port 3001, despite logs showing it's "starting".

## What We've Tried

### 1. Initial Attempt - Wrong API Usage
**Pattern Used:**
```typescript
const RpcServerLive = RpcServer.layer(TasksRpc).pipe(
  Layer.provide(TasksHandlers),
);
```
**Why it failed:** `RpcServer.layer()` doesn't exist. This was a fundamental misunderstanding of the Effect RPC API.

### 2. Second Attempt - Following MacroGraph Pattern
**Pattern Used:**
```typescript
const rpcHttpApp = yield* RpcServer.toHttpApp(TasksRpc).pipe(
  Effect.provide(handlersLayer),
  Effect.provide(RpcServer.layerProtocolHttp({ path: "/" })),
  Effect.provide(RpcSerialization.layerJson)
);

// Then later:
Layer.launch(
  server.pipe(HttpServer.serve(), Layer.provide(NodeHttpServerLayer))
)
```
**Why it failed:** The server logs showed it was starting but never actually listened on the port. The `Layer.launch` was executing but not binding the HTTP server to the network.

### 3. Third Attempt - Following effect-devtools Pattern
**Pattern Used:**
```typescript
const ServerLive = Effect.gen(function* () {
  const rpcApp = yield* RpcServer.toHttpApp(TasksRpc).pipe(
    Effect.provide(TasksHandlers),
    Effect.provide(RpcSerialization.layerJson)
  );
  
  return HttpRouter.empty.pipe(
    HttpRouter.mountApp("/rpc", rpcApp),
    HttpServer.serve(HttpMiddleware.logger)  // KEY: serve directly on router
  );
}).pipe(
  Layer.unwrapEffect,  // KEY: unwrap the Effect layer
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3001 }))
);

// Run with:
Layer.launch(ServerLive).pipe(
  NodeRuntime.runMain  // KEY: use runMain to keep process alive
);
```
**Why it should work (but doesn't):** This is the exact pattern from effect-devtools which reportedly works. The key differences are:
- `HttpServer.serve()` is called directly on the router
- `Layer.unwrapEffect` is used to unwrap the Effect layer
- `NodeRuntime.runMain` keeps the process running

## Working Examples We Found

### MacroGraph (packages/server-backend)
- Uses `HttpRouter.mountApp()` to mount RPC apps
- Creates layers with proper dependencies
- Uses `NodeRuntime.runMain` for execution
- **Key insight:** They pass a function to `NodeHttpServer.layer()` that creates the server

### effect-devtools (packages/server)
- Similar pattern to MacroGraph
- Uses `Layer.unwrapEffect` to handle Effect layers
- Combines WebSocket and HTTP RPC endpoints
- **Key insight:** Returns the router directly with `HttpServer.serve()` already applied

## The Core Issue
The HTTP server is being created but `server.listen(port)` is never being called. This suggests that:
1. The layer composition is correct syntactically
2. The Effect is running (we see logs)
3. But the actual Node.js HTTP server binding is not happening

## What's Different in Working Projects
Both MacroGraph and effect-devtools are:
1. Using Effect platform versions that might handle server binding differently
2. Running as standalone processes, not within a Vite plugin
3. May have additional configuration or setup we're missing

## Next Steps to Try

### Option 1: Subprocess Approach (Most Likely to Work)
Create a standalone server file and spawn it as a subprocess from Vite:
```typescript
// vite-plugin.ts
serverProcess = spawn('npx', ['tsx', './standalone-server.ts'], {
  env: { PORT: '3001' },
  stdio: 'inherit'
});
```
**Why this should work:** Isolates the server from Vite's process, ensuring clean Effect runtime.

### Option 2: Direct Node Server Creation
Skip the Effect HTTP layer and create the server manually:
```typescript
const server = createServer((req, res) => {
  // Handle requests manually
});
server.listen(3001);
```
Then wire up the RPC handlers manually.
**Why this might work:** Bypasses potential Effect layer issues, gives us direct control.

### Option 3: Check Effect Versions
The working projects might be using different versions of Effect packages:
- Check exact versions in effect-devtools and MacroGraph
- Ensure version compatibility between @effect/platform, @effect/rpc, etc.

### Option 4: Debug Layer Composition
Add logging to understand what's happening:
```typescript
const NodeHttpServerLayer = NodeHttpServer.layer(
  () => {
    const server = createServer();
    console.log('Server created');
    server.on('listening', () => console.log('Server listening!'));
    server.on('error', (e) => console.error('Server error:', e));
    return server;
  },
  { port: 3001 }
);
```

## Key Learnings
1. **Effect Layer Composition is Complex:** The order and method of composing layers matters significantly
2. **HttpServer.serve() Must Be Called:** This seems to be what actually sets up request handling
3. **Layer.unwrapEffect is Crucial:** When returning Effects from layer creation
4. **NodeRuntime.runMain Keeps Process Alive:** Without it, the process might exit immediately

## The Real Problem
Despite following the exact patterns from working projects, our server doesn't bind to the port. This suggests either:
1. A version mismatch in Effect packages
2. Something about the Vite plugin environment interfering
3. A subtle difference in how we're composing the layers

The most pragmatic solution is likely the subprocess approach, which would isolate the server completely from Vite's runtime environment.