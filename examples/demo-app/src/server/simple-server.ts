import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"

// Create a simple HTTP router
const router = HttpRouter.empty.pipe(
  HttpRouter.get("/health", HttpServerResponse.json({ status: "ok" })),
  HttpRouter.get("/api/users", HttpServerResponse.json([
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" }
  ])),
  HttpRouter.post("/api/auth/login", HttpServerResponse.json({ token: "fake-jwt-token", user: { id: 1, name: "Admin" } }))
)

// Create and run the server
const server = HttpServer.serve(router).pipe(
  Layer.provide(NodeHttpServer.layer(() => void 0, { port: 3001 }))
)

// Start the server
console.log("Starting simple server on http://localhost:3001")
Layer.launch(server).pipe(NodeRuntime.runMain)