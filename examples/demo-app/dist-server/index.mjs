import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter";
import * as HttpServerResponse from "@effect/platform/HttpServerResponse";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiScalar from "@effect/platform/HttpApiScalar";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as RpcServer from "@effect/rpc/RpcServer";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import { Schema as Schema$1, Context, Data, Effect, Ref, HashMap, Console, Option, Layer } from "effect";
import { createServer } from "node:http";
import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";
import { HttpApiMiddleware, HttpApiSecurity, HttpApiError as HttpApiError$1, HttpApiGroup, HttpApiEndpoint, HttpApi as HttpApi$1 } from "@effect/platform";
const Task = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.Date
});
class TasksRpc extends RpcGroup.make(
  Rpc.make("getTasks", {
    payload: Schema.Void,
    success: Schema.Array(Task)
  }),
  Rpc.make("getTask", {
    payload: Schema.Struct({ id: Schema.String }),
    success: Task,
    error: Schema.String
  }),
  Rpc.make("createTask", {
    payload: Schema.Struct({
      title: Schema.String
    }),
    success: Task
  }),
  Rpc.make("updateTask", {
    payload: Schema.Struct({
      id: Schema.String,
      title: Schema.optional(Schema.String),
      completed: Schema.optional(Schema.Boolean)
    }),
    success: Task,
    error: Schema.String
  }),
  Rpc.make("deleteTask", {
    payload: Schema.Struct({ id: Schema.String }),
    success: Schema.Struct({ success: Schema.Boolean })
  })
) {
}
class Todo extends Schema$1.Class("Todo")({
  id: Schema$1.Number,
  title: Schema$1.String,
  completed: Schema$1.Boolean,
  userId: Schema$1.Number
}) {
}
class CreateTodoRequest extends Schema$1.Class(
  "CreateTodoRequest"
)({
  title: Schema$1.String,
  userId: Schema$1.Number
}) {
}
class UpdateTodoRequest extends Schema$1.Class(
  "UpdateTodoRequest"
)({
  title: Schema$1.optional(Schema$1.String),
  completed: Schema$1.optional(Schema$1.Boolean)
}) {
}
class User extends Schema$1.Class("User")({
  id: Schema$1.Number,
  name: Schema$1.String,
  email: Schema$1.String
}) {
}
class CurrentUser extends Context.Tag("CurrentUser")() {
}
class Authentication extends HttpApiMiddleware.Tag()(
  "Authentication",
  {
    provides: CurrentUser,
    failure: HttpApiError$1.Unauthorized,
    security: {
      bearer: HttpApiSecurity.bearer
    }
  }
) {
}
const TodosApi = HttpApiGroup.make("todos").add(
  HttpApiEndpoint.get("getAllTodos", "/todos").addSuccess(Schema$1.Array(Todo))
).add(
  HttpApiEndpoint.get("getTodo", "/todos/:id").addSuccess(Todo).setPath(Schema$1.Struct({ id: Schema$1.NumberFromString })).addError(HttpApiError$1.NotFound)
).add(
  HttpApiEndpoint.post("createTodo", "/todos").addSuccess(Todo).setPayload(CreateTodoRequest)
).add(
  HttpApiEndpoint.patch("updateTodo", "/todos/:id").addSuccess(Todo).setPath(Schema$1.Struct({ id: Schema$1.NumberFromString })).setPayload(UpdateTodoRequest).addError(HttpApiError$1.NotFound)
).add(
  HttpApiEndpoint.del("deleteTodo", "/todos/:id").addSuccess(Schema$1.Void).setPath(Schema$1.Struct({ id: Schema$1.NumberFromString })).addError(HttpApiError$1.NotFound)
);
const UsersApi = HttpApiGroup.make("users").add(HttpApiEndpoint.get("getCurrentUser", "/users/me").addSuccess(User)).add(
  HttpApiEndpoint.post("login", "/users/login").addSuccess(Schema$1.Struct({ token: Schema$1.String })).setPayload(
    Schema$1.Struct({
      email: Schema$1.String,
      password: Schema$1.String
    })
  ).addError(HttpApiError$1.Unauthorized)
).addError(HttpApiError$1.Unauthorized);
const HttpApi = HttpApi$1.make("api").add(TodosApi).add(UsersApi).prefix("/api");
const PORT = 3001;
class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError") {
  message = `Task with id ${this.id} not found`;
}
class TasksStore extends Effect.Service()("TasksStore", {
  effect: Effect.gen(function* () {
    const store = yield* Ref.make(HashMap.empty());
    const seedTasks = [
      {
        id: "1",
        title: "Learn Effect",
        completed: false,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "2",
        title: "Build with solid-effect-query",
        completed: false,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "3",
        title: "Create RPC services",
        completed: true,
        createdAt: /* @__PURE__ */ new Date()
      }
    ];
    yield* Ref.update(
      store,
      (map) => seedTasks.reduce((acc, task) => HashMap.set(acc, task.id, task), map)
    );
    yield* Console.log(
      "Tasks store initialized: "
      // Ref.get(store).pipe(Effect.map((map) => HashMap.size(map))),
    );
    return {
      getAll: Ref.get(store).pipe(
        Effect.map((map) => Array.from(HashMap.values(map)))
      ),
      getById: (id) => Ref.get(store).pipe(
        Effect.map((map) => HashMap.get(map, id)),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new TaskNotFoundError({ id })),
            onSome: Effect.succeed
          })
        )
      ),
      create: (title) => {
        const task = {
          id: crypto.randomUUID(),
          title,
          completed: false,
          createdAt: /* @__PURE__ */ new Date()
        };
        return Ref.update(store, (map) => HashMap.set(map, task.id, task)).pipe(
          Effect.map(() => task)
        );
      },
      update: (id, updates) => Ref.get(store).pipe(
        Effect.map((map) => HashMap.get(map, id)),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new TaskNotFoundError({ id })),
            onSome: (existing) => {
              const updated = {
                ...existing,
                ...updates.title !== void 0 && { title: updates.title },
                ...updates.completed !== void 0 && {
                  completed: updates.completed
                }
              };
              return Ref.update(
                store,
                (map) => HashMap.set(map, id, updated)
              ).pipe(Effect.map(() => updated));
            }
          })
        )
      ),
      delete: (id) => Ref.get(store).pipe(
        Effect.flatMap((map) => {
          const exists = HashMap.has(map, id);
          if (exists) {
            return Ref.update(store, (map2) => HashMap.remove(map2, id)).pipe(
              Effect.map(() => ({ success: true }))
            );
          }
          return Effect.succeed({ success: false });
        })
      )
    };
  })
}) {
}
const TasksHandlers = TasksRpc.toLayer(
  Effect.gen(function* () {
    const store = yield* TasksStore;
    return {
      getTasks: () => store.getAll,
      getTask: ({ id }) => store.getById(id).pipe(Effect.catchAll(() => Effect.fail(`Task not found: ${id}`))),
      createTask: ({ title }) => store.create(title),
      updateTask: ({ id, title, completed }) => store.update(id, { title, completed }).pipe(Effect.catchAll(() => Effect.fail(`Task not found: ${id}`))),
      deleteTask: ({ id }) => store.delete(id)
    };
  })
).pipe(Layer.provide(TasksStore.Default));
const todos = [
  new Todo({ id: 1, title: "Learn Effect", completed: false, userId: 1 }),
  new Todo({ id: 2, title: "Build with SolidJS", completed: false, userId: 1 }),
  new Todo({ id: 3, title: "Master TypeScript", completed: true, userId: 2 })
];
let nextTodoId = 4;
const HttpTodosLayer = HttpApiBuilder.group(
  HttpApi,
  "todos",
  (handlers) => Effect.gen(function* () {
    const todosRef = yield* Ref.make(todos);
    return handlers.handle("getAllTodos", () => Ref.get(todosRef)).handle(
      "getTodo",
      ({ path: { id } }) => Ref.get(todosRef).pipe(
        Effect.flatMap((todos2) => {
          const todo = todos2.find((t) => t.id === id);
          if (!todo) {
            return Effect.fail(new HttpApiError.NotFound());
          }
          return Effect.succeed(todo);
        })
      )
    ).handle("createTodo", ({ payload }) => {
      const newTodo = new Todo({
        id: nextTodoId++,
        title: payload.title,
        completed: false,
        userId: payload.userId
      });
      return Ref.update(todosRef, (todos2) => [...todos2, newTodo]).pipe(
        Effect.map(() => newTodo)
      );
    }).handle(
      "updateTodo",
      ({ path: { id }, payload }) => Ref.get(todosRef).pipe(
        Effect.flatMap((todos2) => {
          const index = todos2.findIndex((t) => t.id === id);
          if (index === -1) {
            return Effect.fail(new HttpApiError.NotFound());
          }
          const updated = new Todo({
            ...todos2[index],
            ...payload.title !== void 0 && { title: payload.title },
            ...payload.completed !== void 0 && {
              completed: payload.completed
            }
          });
          return Ref.update(todosRef, (todos3) => {
            const newTodos = [...todos3];
            newTodos[index] = updated;
            return newTodos;
          }).pipe(Effect.map(() => updated));
        })
      )
    ).handle(
      "deleteTodo",
      ({ path: { id } }) => Ref.get(todosRef).pipe(
        Effect.flatMap((todos2) => {
          const exists = todos2.some((t) => t.id === id);
          if (!exists) {
            return Effect.fail(new HttpApiError.NotFound());
          }
          return Ref.update(
            todosRef,
            (todos3) => todos3.filter((t) => t.id !== id)
          );
        })
      )
    );
  })
);
const fakeCurrentUser = new User({
  id: 1,
  name: "Alice",
  email: "alice@example.com"
});
const HttpUsersLayer = HttpApiBuilder.group(
  HttpApi,
  "users",
  (handlers) => handlers.handle("getCurrentUser", () => Effect.succeed(fakeCurrentUser)).handle("login", () => {
    return Effect.succeed({ token: `token-fake` });
  })
);
const CurrentUserLayer = Layer.succeed(CurrentUser, fakeCurrentUser);
const HealthRoute = HttpLayerRouter.add(
  "GET",
  "/health",
  HttpServerResponse.json({
    status: "ok",
    server: "effect-rpc-vite",
    endpoints: ["/rpc", "/api"]
  })
);
const RpcRoute = RpcServer.layerHttpRouter({
  group: TasksRpc,
  path: "/rpc/tasks"
}).pipe(
  Layer.provide(TasksHandlers),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(HttpLayerRouter.cors())
);
const HttpApiRoutes = HttpLayerRouter.addHttpApi(HttpApi, {
  openapiPath: "/api/openapi.json"
}).pipe(
  Layer.provide(HttpTodosLayer),
  Layer.provide(HttpUsersLayer),
  Layer.provide(CurrentUserLayer),
  Layer.provide(HttpLayerRouter.cors())
);
const DocsRoute = HttpApiScalar.layerHttpLayerRouter({
  api: HttpApi,
  path: "/api/docs"
});
const AllRoutes = Layer.mergeAll(
  HealthRoute,
  RpcRoute,
  HttpApiRoutes,
  DocsRoute
);
Effect.gen(function* () {
  yield* Effect.log(`🚀 Starting server on http://localhost:${PORT}`);
  yield* Effect.log(`📡 RPC Tasks endpoint: http://localhost:${PORT}/rpc/tasks`);
  yield* Effect.log(`📡 HTTP API endpoint: http://localhost:${PORT}/api`);
  yield* Effect.log(`📡 API docs: http://localhost:${PORT}/api/docs`);
  yield* Effect.log(`❤️  Health check: http://localhost:${PORT}/health`);
}).pipe(Effect.runSync);
HttpLayerRouter.serve(AllRoutes).pipe(
  // // Launch the server with RPC route
  // HttpLayerRouter.serve(RpcRoute).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT })),
  Layer.launch,
  NodeRuntime.runMain
);
