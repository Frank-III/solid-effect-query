import {
  HttpApi as HttpApiBase,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiError,
  HttpApiMiddleware,
  HttpApiSecurity,
} from "@effect/platform";
import { Schema, Context } from "effect";

export class Todo extends Schema.Class<Todo>("Todo")({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
  userId: Schema.Number,
}) {}

export class CreateTodoRequest extends Schema.Class<CreateTodoRequest>(
  "CreateTodoRequest",
)({
  title: Schema.String,
  userId: Schema.Number,
}) {}

export class UpdateTodoRequest extends Schema.Class<UpdateTodoRequest>(
  "UpdateTodoRequest",
)({
  title: Schema.optional(Schema.String),
  completed: Schema.optional(Schema.Boolean),
}) {}

export class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
}) {}

export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  User
>() {}

export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "Authentication",
  {
    provides: CurrentUser,
    failure: HttpApiError.Unauthorized,
    security: {
      bearer: HttpApiSecurity.bearer
    }
  },
) {}

export const TodosApi = HttpApiGroup.make("todos")
  .add(
    HttpApiEndpoint.get("getAllTodos", "/todos").addSuccess(Schema.Array(Todo)),
  )
  .add(
    HttpApiEndpoint.get("getTodo", "/todos/:id")
      .addSuccess(Todo)
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addError(HttpApiError.NotFound),
  )
  .add(
    HttpApiEndpoint.post("createTodo", "/todos")
      .addSuccess(Todo)
      .setPayload(CreateTodoRequest),
  )
  .add(
    HttpApiEndpoint.patch("updateTodo", "/todos/:id")
      .addSuccess(Todo)
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .setPayload(UpdateTodoRequest)
      .addError(HttpApiError.NotFound),
  )
  .add(
    HttpApiEndpoint.del("deleteTodo", "/todos/:id")
      .addSuccess(Schema.Void)
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addError(HttpApiError.NotFound),
  )
  .middlewareEndpoints(Authentication);

export const UsersApi = HttpApiGroup.make("users")
  .add(HttpApiEndpoint.get("getCurrentUser", "/users/me").addSuccess(User))
  .add(
    HttpApiEndpoint.post("login", "/users/login")
      .addSuccess(Schema.Struct({ token: Schema.String }))
      .setPayload(
        Schema.Struct({
          email: Schema.String,
          password: Schema.String,
        }),
      )
      .addError(HttpApiError.Unauthorized),
  )
  .addError(HttpApiError.Unauthorized);

export const HttpApi = HttpApiBase.make("api").add(TodosApi).add(UsersApi);
