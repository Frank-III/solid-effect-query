import { HttpRouter, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"

export const makeServerApp = () => Effect.succeed(
  HttpRouter.empty.pipe(
    HttpRouter.get("/health", HttpServerResponse.json({ status: "ok" })),
    HttpRouter.get("/api/users", HttpServerResponse.json([
      { id: 1, name: "Alice", email: "alice@example.com", createdAt: new Date() },
      { id: 2, name: "Bob", email: "bob@example.com", createdAt: new Date() }
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
)