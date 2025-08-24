// <reference types="vite/client" />
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter";
import * as HttpServerResponse from "@effect/platform/HttpServerResponse";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiScalar from "@effect/platform/HttpApiScalar";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as RpcServer from "@effect/rpc/RpcServer";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import { Data, Layer, Ref, Effect, HashMap, Option, Console } from "effect";
import { createServer } from "node:http";

// Import RPC definitions
import { TasksRpc, Task } from "./api/tasks.rpc";
import { HttpApi, Todo, User, CurrentUser } from "./shared/httpapi";

// Port configuration
const PORT = 3001;

// ==========================================
// Tasks Store Service
// ==========================================
class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError")<{
  id: string;
}> {
  message = `Task with id ${this.id} not found`;
}

class TasksStore extends Effect.Service<TasksStore>()("TasksStore", {
  effect: Effect.gen(function* () {
    const store = yield* Ref.make(HashMap.empty<string, Task>());

    const seedTasks: Task[] = [
      {
        id: "1",
        title: "Learn Effect",
        completed: false,
        createdAt: new Date(),
      },
      {
        id: "2",
        title: "Build with solid-effect-query",
        completed: false,
        createdAt: new Date(),
      },
      {
        id: "3",
        title: "Create RPC services",
        completed: true,
        createdAt: new Date(),
      },
    ];

    yield* Ref.update(store, (map) =>
      seedTasks.reduce((acc, task) => HashMap.set(acc, task.id, task), map),
    );

    yield* Console.log(
      "Tasks store initialized: ",
      // Ref.get(store).pipe(Effect.map((map) => HashMap.size(map))),
    );

    return {
      getAll: Ref.get(store).pipe(
        Effect.map((map) => Array.from(HashMap.values(map))),
      ),

      getById: (id: string) =>
        Ref.get(store).pipe(
          Effect.map((map) => HashMap.get(map, id)),
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new TaskNotFoundError({ id })),
              onSome: Effect.succeed,
            }),
          ),
        ),

      create: (title: string) => {
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          completed: false,
          createdAt: new Date(),
        };
        return Ref.update(store, (map) => HashMap.set(map, task.id, task)).pipe(
          Effect.map(() => task),
        );
      },

      update: (id: string, updates: { title?: string; completed?: boolean }) =>
        Ref.get(store).pipe(
          Effect.map((map) => HashMap.get(map, id)),
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new TaskNotFoundError({ id })),
              onSome: (existing) => {
                const updated: Task = {
                  ...existing,
                  ...(updates.title !== undefined && { title: updates.title }),
                  ...(updates.completed !== undefined && {
                    completed: updates.completed,
                  }),
                };
                return Ref.update(store, (map) =>
                  HashMap.set(map, id, updated),
                ).pipe(Effect.map(() => updated));
              },
            }),
          ),
        ),

      delete: (id: string) =>
        Ref.get(store).pipe(
          Effect.flatMap((map) => {
            const exists = HashMap.has(map, id);
            if (exists) {
              return Ref.update(store, (map) => HashMap.remove(map, id)).pipe(
                Effect.map(() => ({ success: true })),
              );
            }
            return Effect.succeed({ success: false });
          }),
        ),
    };
  }),
}) {}

// ==========================================
// RPC Handlers
// ==========================================
const TasksHandlers = TasksRpc.toLayer(
  Effect.gen(function* () {
    const store = yield* TasksStore;

    return {
      getTasks: () => store.getAll,

      getTask: ({ id }) =>
        store
          .getById(id)
          .pipe(Effect.catchAll(() => Effect.fail(`Task not found: ${id}`))),

      createTask: ({ title }) => store.create(title),

      updateTask: ({ id, title, completed }) =>
        store
          .update(id, { title, completed })
          .pipe(Effect.catchAll(() => Effect.fail(`Task not found: ${id}`))),

      deleteTask: ({ id }) => store.delete(id),
    };
  }),
).pipe(Layer.provide(TasksStore.Default));

// ==========================================
// HTTP API Implementation
// ==========================================

// In-memory database for HTTP API
const todos = [
  new Todo({ id: 1, title: "Learn Effect", completed: false, userId: 1 }),
  new Todo({ id: 2, title: "Build with SolidJS", completed: false, userId: 1 }),
  new Todo({ id: 3, title: "Master TypeScript", completed: true, userId: 2 }),
];

// Users are defined but not used in this simple example
// const users = [
//   new User({ id: 1, name: "Alice", email: "alice@example.com" }),
//   new User({ id: 2, name: "Bob", email: "bob@example.com" }),
// ];

let nextTodoId = 4;

// HTTP API Handlers - simplified without authentication
const HttpTodosLayer = HttpApiBuilder.group(HttpApi, "todos", (handlers) =>
  Effect.gen(function* () {
    const todosRef = yield* Ref.make(todos);

    return handlers
      .handle("getAllTodos", () => Ref.get(todosRef))
      .handle("getTodo", ({ path: { id } }) =>
        Ref.get(todosRef).pipe(
          Effect.flatMap((todos) => {
            const todo = todos.find((t) => t.id === id);
            if (!todo) {
              return Effect.fail(new HttpApiError.NotFound());
            }
            return Effect.succeed(todo);
          }),
        ),
      )
      .handle("createTodo", ({ payload }) => {
        const newTodo = new Todo({
          id: nextTodoId++,
          title: payload.title,
          completed: false,
          userId: payload.userId,
        });
        return Ref.update(todosRef, (todos) => [...todos, newTodo]).pipe(
          Effect.map(() => newTodo),
        );
      })
      .handle("updateTodo", ({ path: { id }, payload }) =>
        Ref.get(todosRef).pipe(
          Effect.flatMap((todos) => {
            const index = todos.findIndex((t) => t.id === id);
            if (index === -1) {
              return Effect.fail(new HttpApiError.NotFound());
            }
            const updated = new Todo({
              ...todos[index],
              ...(payload.title !== undefined && { title: payload.title }),
              ...(payload.completed !== undefined && {
                completed: payload.completed,
              }),
            });
            return Ref.update(todosRef, (todos) => {
              const newTodos = [...todos];
              newTodos[index] = updated;
              return newTodos;
            }).pipe(Effect.map(() => updated));
          }),
        ),
      )
      .handle("deleteTodo", ({ path: { id } }) =>
        Ref.get(todosRef).pipe(
          Effect.flatMap((todos) => {
            const exists = todos.some((t) => t.id === id);
            if (!exists) {
              return Effect.fail(new HttpApiError.NotFound());
            }
            return Ref.update(todosRef, (todos) =>
              todos.filter((t) => t.id !== id),
            );
          }),
        ),
      );
  }),
);

// Fake current user for simplicity
const fakeCurrentUser = new User({
  id: 1,
  name: "Alice",
  email: "alice@example.com",
});

const HttpUsersLayer = HttpApiBuilder.group(HttpApi, "users", (handlers) =>
  handlers
    .handle("getCurrentUser", () => Effect.succeed(fakeCurrentUser))
    .handle("login", () => {
      // Simple fake login - always succeeds for testing
      return Effect.succeed({ token: `token-fake` });
    }),
);

// Create a layer that provides CurrentUser service
const CurrentUserLayer = Layer.succeed(CurrentUser, fakeCurrentUser);

// ==========================================
// Routes setup using HttpLayerRouter
// ==========================================

// Health check route
const HealthRoute = HttpLayerRouter.add(
  "GET",
  "/health",
  HttpServerResponse.json({
    status: "ok",
    server: "effect-rpc-vite",
    endpoints: ["/rpc", "/api"],
  }),
);

// RPC route using HttpLayerRouter
const RpcRoute = RpcServer.layerHttpRouter({
  group: TasksRpc,
  path: "/rpc",
}).pipe(
  Layer.provide(TasksHandlers),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(HttpLayerRouter.cors()),
);

// HTTP API routes
const HttpApiRoutes = HttpLayerRouter.addHttpApi(HttpApi, {
  openapiPath: "/api/openapi.json",
}).pipe(
  Layer.provide(HttpTodosLayer),
  Layer.provide(HttpUsersLayer),
  Layer.provide(CurrentUserLayer),
  Layer.provide(HttpLayerRouter.cors()),
);

// API documentation route
const DocsRoute = HttpApiScalar.layerHttpLayerRouter({
  api: HttpApi,
  path: "/api/docs",
});

// Merge all routes
const AllRoutes = Layer.mergeAll(
  HealthRoute,
  RpcRoute,
  HttpApiRoutes,
  DocsRoute,
);

// ==========================================
// Start the server
// ==========================================
Effect.gen(function* () {
  yield* Effect.log(`🚀 Starting RPC server on http://localhost:${PORT}`);
  yield* Effect.log(`📡 RPC endpoint: http://localhost:${PORT}/rpc`);
  yield* Effect.log(`📡 HTTP API endpoint: http://localhost:${PORT}/api`);
  yield* Effect.log(`📡 API docs: http://localhost:${PORT}/api/docs`);
  yield* Effect.log(`❤️  Health check: http://localhost:${PORT}/health`);
}).pipe(Effect.runSync);

// Launch the server with all routes
HttpLayerRouter.serve(AllRoutes).pipe(
  // HttpLayerRouter.serve(RpcRoute).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT })),
  Layer.launch,
  NodeRuntime.runMain,
);
