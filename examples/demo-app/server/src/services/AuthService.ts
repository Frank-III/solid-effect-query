import { Effect, Layer } from "effect"
import { AuthMiddleware, Unauthorized } from "../domain/Auth"

export const AuthLayer = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    // Simple auth for demo - in real app would validate JWT, session, etc.
    return Effect.fn("AuthMiddleware")(function* ({ headers }) {
      const userId = headers["x-user-id"]
      const userName = headers["x-user-name"]
      
      if (!userId || !userName) {
        return yield* new Unauthorized()
      }
      
      return { id: userId, name: userName }
    })
  })
)