/// <reference types="vite/client" />
import { createServer } from "node:http"
import { HttpRouter, HttpServer, HttpMiddleware, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { RpcServer } from "@effect/rpc"
import { RpcSerialization } from "@effect/rpc"
import { Effect, Layer, Fiber, Option } from "effect"
import { apiRouter, HttpApiLive } from "./app"
import { TasksRpc } from "../api/tasks.rpc"
import { TasksHandlers } from "./tasks-handlers"

// Port configuration
const PORT = 3001

// Create HMR-aware Node HTTP Server Layer (following MacroGraph pattern)
const HMRAwareNodeHttpServerLayer = NodeHttpServer.layer(
  () => {
    const server = createServer()
    
    // Get current fiber for HMR cleanup
    const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
    
    // Handle HMR if available
    if (import.meta.hot) {
      import.meta.hot.accept(() => {
        console.log("🔄 HMR: Reloading server...")
        Fiber.interrupt(fiber).pipe(Effect.runPromise)
        server.closeAllConnections()
        server.close()
      })
    }
    
    return server
  },
  { port: PORT, host: "0.0.0.0" }
)

// Create the server with both HTTP API and RPC integration
const ServerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    // Create RPC HTTP app
    const rpcApp = yield* RpcServer.toHttpApp(TasksRpc).pipe(
      Effect.provide(TasksHandlers),
      Effect.provide(RpcSerialization.layerJson)
    )
    
    // Combine HTTP API app with RPC app
    const router = HttpRouter.empty.pipe(
      // Health check endpoint
      HttpRouter.get("/health", 
        HttpServerResponse.json({
          status: "ok",
          server: "effect-vite",
          features: ["http-api", "rpc"]
        })
      ),
      
      // Mount the HTTP API app at /api with its middleware
      HttpRouter.mount("/api", apiRouter),
      
      // Mount RPC app at /rpc
      HttpRouter.mountApp("/rpc", rpcApp)
    )
    
    // Return the server layer
    return HttpServer.serve(router, HttpMiddleware.logger).pipe(
      Layer.provide(HttpApiLive),
      Layer.provide(HMRAwareNodeHttpServerLayer)
    )
  })
)

// Launch the server
const program = Effect.gen(function* () {
  console.log(`🚀 Starting Effect server on http://localhost:${PORT}`)
  console.log(`📡 RPC endpoint: http://localhost:${PORT}/rpc`)
  console.log(`🌐 HTTP API endpoint: http://localhost:${PORT}/api`)
  console.log(`❤️  Health check: http://localhost:${PORT}/health`)
  console.log(`🔥 HMR enabled - server will reload on changes`)
  
  return yield* Layer.launch(ServerLive)
})

program.pipe(Effect.scoped, NodeRuntime.runMain)