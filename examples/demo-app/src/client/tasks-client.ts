import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as RpcClient from "@effect/rpc/RpcClient";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as Either from "effect/Either";
import { TasksRpc } from "../api/tasks.rpc";
import { makeRpcHooks } from "solid-effect-query-rpc";

export class TasksClient extends Effect.Service<TasksClient>()("TasksClient", {
  scoped: Effect.gen(function* () {
    // Create the RPC client with proper Effect patterns
    const client = yield* RpcClient.make(TasksRpc, { flatten: true }).pipe(
      Effect.tap(() => Effect.log("TasksClient: RPC client created")),
    );

    // Return the service interface that matches what makeRpcHooks expects
    return { client };
  }),
  dependencies: [
    RpcClient.layerProtocolHttp({
      url: "/rpc/tasks", // Align with server route mounted at /rpc/tasks
    }).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson])),
  ],
}) {}

// Create runtime for RPC with error handling
const runtime = ManagedRuntime.make(TasksClient.Default).pipe(
  Effect.tap(() => Effect.log("TasksClient runtime initialized")),
  Effect.tapError((error) =>
    Effect.logError("TasksClient runtime error:", error),
  ),
  Effect.runSync,
);

const useEffectRuntime = () => runtime;

// Create RPC hooks
const { useRpcQuery, useRpcMutation } = makeRpcHooks(
  TasksClient,
  useEffectRuntime,
);

// Add verification helper for debugging with proper Effect logging
export const verifyClient = Effect.gen(function* () {
  yield* Effect.log("[TasksClient] Starting verification...");
  const service = yield* TasksClient;
  yield* Effect.log("[TasksClient] Service structure obtained");
  yield* Effect.log(`[TasksClient] Has client: ${"client" in service}`);

  if (service.client) {
    yield* Effect.log("[TasksClient] Client exists, testing getTasks...");
    const result = yield* service.client("getTasks", {}).pipe(
      Effect.either,
      Effect.tap((either) =>
        Either.isRight(either)
          ? Effect.log("[TasksClient] Test call succeeded", {
              tasksCount: either.right.length,
            })
          : Effect.logError("[TasksClient] Test call failed", either.left),
      ),
    );
    return result;
  }

  yield* Effect.logWarning("[TasksClient] No client found in service");
  return null;
});

// Log when module loads
Effect.gen(function* () {
  yield* Effect.log("[TasksClient] Module loaded, runtime created");
  yield* Effect.log(`[TasksClient] Service key: ${TasksClient.key}`);
}).pipe(Effect.runSync);

// Export hooks
export const useTasksQuery = useRpcQuery;
export const useTasksMutation = useRpcMutation;

// Export runtime for testing
export { runtime };
