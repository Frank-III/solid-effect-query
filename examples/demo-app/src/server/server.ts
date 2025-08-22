import {
  HttpApiBuilder,
  HttpServer,
  HttpServerRequest,
  HttpApiError,
  HttpServerResponse,
  HttpRouter,
} from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { RpcServer, RpcSerialization } from "@effect/rpc";
import { Layer, Effect, Ref, Console } from "effect";
import { HttpApi, Todo, User, CurrentUser } from "../shared/httpapi";
import { CalculatorRpcs, CalculatorLive } from "../shared/rpc";
import { createServer } from "node:http";

// In-memory database
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

// HttpApi Implementation
const HttpTodosLive = HttpApiBuilder.group(HttpApi, "todos", (handlers) =>
  Effect.gen(function* () {
    const todosRef = yield* Ref.make(todos);

    return handlers
      .handle("getAllTodos", () => Ref.get(todosRef))
      .handle("getTodo", ({ path: { id } }) =>
        Effect.gen(function* () {
          const todos = yield* Ref.get(todosRef);
          const todo = todos.find((t) => t.id === id);
          if (!todo) {
            return yield* HttpApiError.notFound({
              message: `Todo with id ${id} not found`,
            });
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
            return yield* HttpApiError.notFound({
              message: `Todo with id ${id} not found`,
            });
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
            return yield* HttpApiError.notFound({
              message: `Todo with id ${id} not found`,
            });
          }
          yield* Ref.update(todosRef, (todos) =>
            todos.filter((t) => t.id !== id),
          );
        }),
      );
  }),
);

const HttpUsersLive = HttpApiBuilder.group(HttpApi, "users", (handlers) =>
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
          return yield* HttpApiError.unauthorized({
            message: "Invalid credentials",
          });
        }
        return { token: `token-${user.id}` };
      }),
    ),
);

// Authentication middleware
const AuthenticationLive = Layer.effect(
  CurrentUser,
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const authHeader = request.headers["authorization"];

    if (!authHeader?.startsWith("Bearer token-")) {
      return yield* HttpApiError.unauthorized({
        message: "Authentication required",
      });
    }

    const userId = parseInt(authHeader.replace("Bearer token-", ""));
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return yield* HttpApiError.unauthorized({
        message: "Authentication required",
      });
    }

    return user;
  }),
);

// Create Http App
const httpApiApp = HttpApiBuilder.serve(HttpApi).pipe(
  Layer.provide(HttpTodosLive),
  Layer.provide(HttpUsersLive),
  Layer.provide(AuthenticationLive),
);

// Create RPC App
const RpcLayer = RpcServer.layer(CalculatorRpcs).pipe(
  Layer.provide(CalculatorLive)
);

const RpcProtocol = RpcServer.layerProtocolHttp({
  path: "/rpc",
}).pipe(Layer.provide(RpcSerialization.layerNdjson));

// Combine all routes
const app = HttpRouter.empty.pipe(
  HttpRouter.mount("/api", httpApiApp),
  HttpRouter.mount("/rpc", Layer.launch(RpcLayer).pipe(
    Effect.map(() => HttpRouter.empty),
    Layer.unwrapEffect,
    Layer.provide(RpcProtocol)
  )),
  HttpRouter.get("/health", HttpServerResponse.json({ status: "ok" })),
);

// Export server creation function for Vite plugin
export const createEffectServer = (port: number = 3001) => {
  const ServerLive = HttpServer.serve(app).pipe(
    Layer.provide(NodeHttpServer.layer(() => createServer(), { port })),
  );

  return {
    layer: ServerLive,
    start: () => Layer.launch(ServerLive).pipe(
      Effect.tap(() => Console.log(`Server started on http://localhost:${port}`)),
      Effect.tap(() => Console.log(`HttpApi available at http://localhost:${port}/api`)),
      Effect.tap(() => Console.log(`RPC available at http://localhost:${port}/rpc`)),
    )
  };
};

// Run as standalone server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createEffectServer();
  NodeRuntime.runMain(
    server.start().pipe(
      Effect.andThen(Effect.never)
    )
  );
}