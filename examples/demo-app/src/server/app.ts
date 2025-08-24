import {
  HttpApiBuilder,
  HttpServerRequest,
  HttpApiError,
  HttpRouter,
} from "@effect/platform";
import { Layer, Effect, Ref } from "effect";
import { HttpApi, Todo, User, CurrentUser } from "../shared/httpapi";

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
          return yield* Effect.fail(new HttpApiError.Unauthorized());
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
      return yield* Effect.fail(new HttpApiError.Unauthorized());
    }

    const userId = parseInt(authHeader.replace("Bearer token-", ""));
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return yield* Effect.fail(new HttpApiError.Unauthorized());
    }

    return user;
  }),
);

// Create Http App
const ApiLive = Layer.mergeAll(
  HttpTodosLive,
  HttpUsersLive,
  AuthenticationLive,
);

// Create the API router
export const apiRouter = HttpApiBuilder.toWebHandler(HttpApi, {
  middleware: ApiLive,
});

// Export the app without mounting (let the server handle mounting)
export const app = apiRouter;

export const HttpApiLive = ApiLive;
