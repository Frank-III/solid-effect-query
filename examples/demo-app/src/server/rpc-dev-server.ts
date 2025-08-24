/// <reference types="vite/client" />
import { createServer } from "node:http";
import {
  HttpRouter,
  HttpServer,
  HttpServerResponse,
  HttpMiddleware,
} from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { RpcServer } from "@effect/rpc";
import { RpcSerialization } from "@effect/rpc";
import { Effect, Layer } from "effect";
import { TasksRpc } from "../api/tasks.rpc";
import { TasksHandlers } from "./tasks-handlers";

// Port configuration
const PORT = 3001;

// Create RPC app
const createRpcApp = RpcServer.toHttpApp(TasksRpc).pipe(
  Effect.provide(Layer.mergeAll(TasksHandlers, RpcSerialization.layerJson)),
);

// Create the main router
const createRouter = Effect.gen(function* () {
  const rpcApp = yield* createRpcApp;

  return HttpRouter.empty.pipe(
    // Health check
    HttpRouter.get(
      "/health",
      HttpServerResponse.json({
        status: "ok",
        server: "effect-rpc-vite",
        endpoints: ["/rpc", "/api/tasks"],
      }),
    ),

    // Mount RPC app
    HttpRouter.mountApp("/rpc", rpcApp),

    // REST-style endpoints for testing
    HttpRouter.get(
      "/api/tasks",
      HttpServerResponse.json([
        { id: "1", title: "Learn Effect", completed: false },
        { id: "2", title: "Build with RPC", completed: false },
      ]),
    ),
  );
});

// Create and launch the server
const ServerLive = createRouter.pipe(
  Effect.map((router) =>
    HttpServer.serve(router, HttpMiddleware.logger).pipe(
      Layer.provide(NodeHttpServer.layer(() => createServer(), { port: PORT })),
    ),
  ),
  Effect.flatMap(Layer.launch),
  Effect.scoped,
);

// Start the server
console.log(`🚀 Starting RPC server on http://localhost:${PORT}`);
console.log(`📡 RPC endpoint: http://localhost:${PORT}/rpc`);
console.log(`❤️  Health check: http://localhost:${PORT}/health`);

ServerLive.pipe(NodeRuntime.runMain);
