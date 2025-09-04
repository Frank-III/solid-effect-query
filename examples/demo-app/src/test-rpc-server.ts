import { HttpLayerRouter } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Rpc, RpcGroup, RpcSerialization, RpcServer } from "@effect/rpc"
import { Effect, Layer, Schema } from "effect"
import { createServer } from "http"

export class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String
}) {}

// Define a group of RPCs
export class UserRpcs extends RpcGroup.make(
  Rpc.make("UserById", {
    success: User,
    error: Schema.String,
    payload: {
      id: Schema.String
    }
  })
) {}

const UserHandlers = UserRpcs.toLayer({
  UserById: ({ id }) => Effect.succeed(new User({ id, name: "John Doe" }))
})

// Use HttpLayerRouter to register the rpc server
const RpcRoute = RpcServer.layerHttpRouter({
  group: UserRpcs,
  path: "/rpc"
}).pipe(
  Layer.provide(UserHandlers),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(HttpLayerRouter.cors())
)

Effect.gen(function* () {
  yield* Effect.log(`🚀 Starting test RPC server on http://localhost:3002`)
  yield* Effect.log(`📡 RPC endpoint: http://localhost:3002/rpc`)
}).pipe(Effect.runSync)

// Start the HTTP server with the RPC route
HttpLayerRouter.serve(RpcRoute).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3002 })),
  Layer.launch,
  NodeRuntime.runMain
)