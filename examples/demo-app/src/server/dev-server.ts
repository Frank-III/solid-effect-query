/// <reference types="vite/client" />
import { HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { app, HttpApiLive } from "./app"

// Port configuration
const PORT = 3001

// Combine the basic routes with the API routes
const ServerLive = HttpServer.serve(app).pipe(
  Layer.provide(HttpApiLive),
  Layer.provide(NodeHttpServer.layer({ port: PORT }))
)

// Launch the server
console.log(`🚀 Effect HTTP API server starting on http://localhost:${PORT}`)
Layer.launch(ServerLive).pipe(
  NodeRuntime.runMain
)

// HMR Support
if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    console.log("🔄 HMR: Disposing server...")
  })
}