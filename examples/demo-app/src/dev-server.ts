// <reference types="vite/client" />
import {
  HttpRouter,
  HttpServer,
  HttpServerResponse,
  HttpMiddleware,
  HttpApiBuilder,
  HttpServerRequest,
  HttpApiError,
  HttpApiMiddleware,
} from "@effect/platform";
import { createServer } from "node:http";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { RpcServer } from "@effect/rpc";
import { RpcSerialization } from "@effect/rpc";
import { Layer, Redacted, Ref } from "effect";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

// Import RPC definitions
import { TasksRpc, Task } from "./api/tasks.rpc";
import {
  HttpApi,
  Todo,
  User,
  CurrentUser,
  Authentication,
} from "./shared/httpapi";

// Port configuration
const PORT = 3001;

// ==========================================
// Tasks Store Service
// ==========================================
class TaskNotFoundError extends Error {
  readonly _tag = "TaskNotFoundError";
  constructor(readonly id: string) {
    super(`Task with id ${id} not found`);
  }
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

    return {
      getAll: Effect.gen(function* () {
        const map = yield* Ref.get(store);
        return Array.from(HashMap.values(map));
      }),

      getById: (id: string) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(store);
          const task = HashMap.get(map, id);
          return Option.match(task, {
            onNone: () => Effect.fail(new TaskNotFoundError(id)),
            onSome: (task) => Effect.succeed(task),
          });
        }).pipe(Effect.flatten),

      create: (title: string) =>
        Effect.gen(function* () {
          const task: Task = {
            id: crypto.randomUUID(),
            title,
            completed: false,
            createdAt: new Date(),
          };
          yield* Ref.update(store, (map) => HashMap.set(map, task.id, task));
          return task;
        }),

      update: (id: string, updates: { title?: string; completed?: boolean }) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(store);
          const existing = HashMap.get(map, id);

          if (Option.isNone(existing)) {
            return yield* Effect.fail(new TaskNotFoundError(id));
          }

          const updated: Task = {
            ...existing.value,
            ...(updates.title !== undefined && { title: updates.title }),
            ...(updates.completed !== undefined && {
              completed: updates.completed,
            }),
          };

          yield* Ref.update(store, (map) => HashMap.set(map, id, updated));
          return updated;
        }),

      delete: (id: string) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(store);
          const exists = HashMap.has(map, id);

          if (exists) {
            yield* Ref.update(store, (map) => HashMap.remove(map, id));
          }

          return { success: exists };
        }),
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
        store.getById(id).pipe(Effect.mapError((error) => error.message)),

      createTask: ({ title }) => store.create(title),

      updateTask: ({ id, title, completed }) =>
        store
          .update(id, { title, completed })
          .pipe(Effect.mapError((error) => error.message)),

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

const users = [
  new User({ id: 1, name: "Alice", email: "alice@example.com" }),
  new User({ id: 2, name: "Bob", email: "bob@example.com" }),
];

let nextTodoId = 4;

// HTTP API Handlers
const HttpTodosLayer = HttpApiBuilder.group(HttpApi, "todos", (handlers) =>
  Effect.gen(function* () {
    const todosRef = yield* Ref.make(todos);

    return handlers
      .handle("getAllTodos", () => Ref.get(todosRef))
      .handle("getTodo", ({ path: { id } }) =>
        Effect.gen(function* () {
          const todos = yield* Ref.get(todosRef);
          const todo = todos.find((t) => t.id === id);
          if (!todo) {
            return yield* Effect.fail(new HttpApiError.NotFound());
          }
          return todo;
        }),
      )
      .handle("createTodo", ({ payload }) =>
        Effect.gen(function* () {
          const newTodo = new Todo({
            id: nextTodoId++,
            title: payload.title,
            completed: false,
            userId: payload.userId,
          });
          yield* Ref.update(todosRef, (todos) => [...todos, newTodo]);
          return newTodo;
        }),
      )
      .handle("updateTodo", ({ path: { id }, payload }) =>
        Effect.gen(function* () {
          const todos = yield* Ref.get(todosRef);
          const index = todos.findIndex((t) => t.id === id);
          if (index === -1) {
            return yield* Effect.fail(new HttpApiError.NotFound());
          }
          const updated = new Todo({
            ...todos[index],
            ...(payload.title !== undefined && { title: payload.title }),
            ...(payload.completed !== undefined && {
              completed: payload.completed,
            }),
          });
          yield* Ref.update(todosRef, (todos) => {
            const newTodos = [...todos];
            newTodos[index] = updated;
            return newTodos;
          });
          return updated;
        }),
      )
      .handle("deleteTodo", ({ path: { id } }) =>
        Effect.gen(function* () {
          const todos = yield* Ref.get(todosRef);
          const exists = todos.some((t) => t.id === id);
          if (!exists) {
            return yield* Effect.fail(new HttpApiError.NotFound());
          }
          yield* Ref.update(todosRef, (todos) =>
            todos.filter((t) => t.id !== id),
          );
        }),
      );
  }),
);

const HttpUsersLayer = HttpApiBuilder.group(HttpApi, "users", (handlers) =>
  handlers
    .handle("getCurrentUser", () =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        return user;
      }),
    )
    .handle("login", ({ payload }) =>
      Effect.gen(function* () {
        const user = users.find((u) => u.email === payload.email);
        if (!user || payload.password !== "password") {
          return yield* Effect.fail(new HttpApiError.Unauthorized());
        }
        return { token: `token-${user.id}` };
      }),
    ),
);

// Authentication middleware
const AuthenticationLive = Layer.succeed(
  Authentication,
  Authentication.of({
    bearer: (token) =>
      Effect.gen(function* () {
        // Extract the actual token value from Redacted
        const tokenValue = Redacted.value(token);

        // Parse the token to get the user ID
        if (!tokenValue.startsWith("token-")) {
          return yield* Effect.fail(new HttpApiError.Unauthorized());
        }

        const userId = parseInt(tokenValue.replace("token-", ""));
        const user = users.find((u) => u.id === userId);

        if (!user) {
          return yield* Effect.fail(new HttpApiError.Unauthorized());
        }

        return user;
      }),
  }),
);

// Create the API layer with handlers
const ApiLive = Layer.provide(HttpApiBuilder.api(HttpApi), [
  HttpTodosLayer,
  HttpUsersLayer,
  AuthenticationLive,
]);

// Create the HTTP API app as an Effect
const createHttpApiApp = HttpApiBuilder.httpApp.pipe(
  Effect.provide(ApiLive),
);

// ==========================================
// Create RPC and HTTP API apps
// ==========================================
const createRpcApp = RpcServer.toHttpApp(TasksRpc).pipe(
  Effect.provide(Layer.mergeAll(TasksHandlers, RpcSerialization.layerJson)),
  Effect.scoped,
);

// Create the main router
const createRouter = Effect.gen(function* () {
  const rpcApp = yield* createRpcApp;
  const httpApiApp = yield* createHttpApiApp;

  return HttpRouter.empty.pipe(
    // Health check
    HttpRouter.get(
      "/health",
      HttpServerResponse.json({
        status: "ok",
        server: "effect-rpc-vite",
        endpoints: ["/rpc", "/api"],
      }),
    ),

    // Mount RPC app
    HttpRouter.mountApp("/rpc", rpcApp),

    // Mount HTTP API app
    HttpRouter.mountApp("/api", httpApiApp),
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
Effect.gen(function* () {
  yield* Effect.log(`🚀 Starting RPC server on http://localhost:${PORT}`);
  yield* Effect.log(`📡 RPC endpoint: http://localhost:${PORT}/rpc`);
  yield* Effect.log(`📡 HTTP API endpoint: http://localhost:${PORT}/api`);
  yield* Effect.log(`❤️  Health check: http://localhost:${PORT}/health`);
}).pipe(Effect.runSync);

ServerLive.pipe(NodeRuntime.runMain);
