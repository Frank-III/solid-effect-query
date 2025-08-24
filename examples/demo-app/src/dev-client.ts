import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as RpcClient from "@effect/rpc/RpcClient";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import { Effect, Console, Layer } from "effect";

// Import RPC and HTTP API definitions
import { TasksRpc } from "./api/tasks.rpc";
import { HttpApi } from "./shared/httpapi";

// Test the RPC API
const testRpc = Effect.gen(function* () {
  yield* Console.log("=== Testing RPC API ===");

  const client = yield* RpcClient.make(TasksRpc, { flatten: true });

  // Test getTasks
  yield* Console.log("\n1. Getting all tasks:");
  const tasks = yield* client("getTasks", undefined);
  yield* Console.log(JSON.stringify(tasks, null, 2));

  // Test createTask
  yield* Console.log("\n2. Creating a new task:");
  const newTask = yield* client("createTask", {
    title: "Test from RPC client",
  });
  yield* Console.log(JSON.stringify(newTask, null, 2));

  // Test getTask
  yield* Console.log(`\n3. Getting task with id ${newTask.id}:`);
  const task = yield* client("getTask", { id: newTask.id });
  yield* Console.log(JSON.stringify(task, null, 2));

  // Test updateTask
  yield* Console.log(`\n4. Updating task ${newTask.id}:`);
  const updated = yield* client("updateTask", {
    id: newTask.id,
    title: "Updated via RPC",
    completed: true,
  });
  yield* Console.log(JSON.stringify(updated, null, 2));

  // Test deleteTask
  yield* Console.log(`\n5. Deleting task ${newTask.id}:`);
  const deleted = yield* client("deleteTask", { id: newTask.id });
  yield* Console.log(JSON.stringify(deleted, null, 2));
}).pipe(
  Effect.provide(
    RpcClient.layerProtocolHttp({
      url: "http://localhost:3001/rpc/",
    }).pipe(
      Layer.provide(RpcSerialization.layerJson),
      Layer.provide(NodeHttpClient.layer),
    ),
  ),
);

// Test the HTTP API
const testHttpApi = Effect.gen(function* () {
  yield* Console.log("\n\n=== Testing HTTP API ===");

  const client = yield* HttpApiClient.make(HttpApi, {
    baseUrl: "http://localhost:3001/",
  });

  // First, login to get a token
  yield* Console.log("\n1. Logging in:");
  const loginResult = yield* client.users.login({
    payload: {
      email: "alice@example.com",
      password: "password",
    },
  });
  yield* Console.log(`Got token: ${loginResult.token}`);

  // Create a new client with the token
  const authenticatedClient = yield* HttpApiClient.make(HttpApi, {
    baseUrl: "http://localhost:3001/",
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.setHeader(
        "Authorization",
        `Bearer ${loginResult.token}`,
      ),
    ),
  });

  // Test getAllTodos
  yield* Console.log("\n2. Getting all todos:");
  const todos = yield* authenticatedClient.todos.getAllTodos();
  yield* Console.log(JSON.stringify(todos, null, 2));

  // Test createTodo
  yield* Console.log("\n3. Creating a new todo:");
  const newTodo = yield* authenticatedClient.todos.createTodo({
    payload: {
      title: "Test from HTTP API client",
      userId: 1,
    },
  });
  yield* Console.log(JSON.stringify(newTodo, null, 2));

  // Test getTodo
  yield* Console.log(`\n4. Getting todo with id ${newTodo.id}:`);
  const todo = yield* authenticatedClient.todos.getTodo({
    path: { id: newTodo.id },
  });
  yield* Console.log(JSON.stringify(todo, null, 2));

  // Test updateTodo
  yield* Console.log(`\n5. Updating todo ${newTodo.id}:`);
  const updatedTodo = yield* authenticatedClient.todos.updateTodo({
    path: { id: newTodo.id },
    payload: {
      title: "Updated via HTTP API",
      completed: true,
    },
  });
  yield* Console.log(JSON.stringify(updatedTodo, null, 2));

  // Test deleteTodo
  yield* Console.log(`\n6. Deleting todo ${newTodo.id}:`);
  yield* authenticatedClient.todos.deleteTodo({
    path: { id: newTodo.id },
  });
  yield* Console.log("Todo deleted successfully");

  // Test getCurrentUser
  yield* Console.log("\n7. Getting current user:");
  const currentUser = yield* authenticatedClient.users.getCurrentUser();
  yield* Console.log(JSON.stringify(currentUser, null, 2));
});

// Run both tests
const program = Effect.gen(function* () {
  yield* testRpc.pipe(
    Effect.catchAll((error) => Console.error(`RPC test failed: ${error}`)),
  );

  yield* testHttpApi.pipe(
    Effect.catchAll((error) => Console.error(`HTTP API test failed: ${error}`)),
  );
});

program.pipe(
  Effect.scoped,
  Effect.provide(NodeHttpClient.layer),
  NodeRuntime.runMain,
);
