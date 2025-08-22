import { RpcServer, RpcSerialization } from "@effect/rpc"
import { HttpLayerRouter } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"
import { TodoRpcs, AnalyticsRpcs } from "./domain/Rpc"
import { TodoHandlers, AnalyticsHandlers } from "./services/RpcHandlers"
import { AuthLayer } from "./services/AuthService"

// Create RPC routes
const TodoRoute = RpcServer.layerHttpRouter({
  group: TodoRpcs,
  path: "/rpc/todos",
}).pipe(
  Layer.provide(TodoHandlers),
  Layer.provide(AuthLayer),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(HttpLayerRouter.cors())
)

const AnalyticsRoute = RpcServer.layerHttpRouter({
  group: AnalyticsRpcs,
  path: "/rpc/analytics",
}).pipe(
  Layer.provide(AnalyticsHandlers),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(HttpLayerRouter.cors())
)

// Combine routes
const Routes = Layer.merge(TodoRoute, AnalyticsRoute)

// Create and launch server
export const HttpLayer = HttpLayerRouter.serve(Routes).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3001 }))
)

// Launch the server
HttpLayer.pipe(Layer.launch).pipe((effect) => {
  import("@effect/platform-node/NodeRuntime").then(({ runMain }) => {
    runMain(effect)
  })
})