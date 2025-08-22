import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"

// Create a simple HTTP router
const router = HttpRouter.empty.pipe(
  HttpRouter.get("/health", HttpServerResponse.json({ status: "ok", server: "effect-vite" })),
  HttpRouter.get("/api/users", HttpServerResponse.json([
    { id: 1, name: "Alice", email: "alice@example.com", createdAt: new Date() },
    { id: 2, name: "Bob", email: "bob@example.com", createdAt: new Date() },
    { id: 3, name: "Charlie", email: "charlie@example.com", createdAt: new Date() }
  ])),
  HttpRouter.post("/api/auth/login", HttpServerResponse.json({ 
    token: "fake-jwt-token", 
    user: { id: 1, name: "Admin", email: "admin@example.com", createdAt: new Date() } 
  })),
  HttpRouter.get("/api/auth/me", HttpServerResponse.json({ 
    id: 1, 
    name: "Admin", 
    email: "admin@example.com", 
    createdAt: new Date() 
  }))
)

// Create and run the server
const ServerLive = HttpServer.serve(router).pipe(
  Layer.provide(NodeHttpServer.layer(() => createServer(), { port: 3001 }))
)

// Start the server
console.log("Starting server on http://localhost:3001")
Layer.launch(ServerLive).pipe(NodeRuntime.runMain)