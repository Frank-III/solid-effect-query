import * as Schema from "effect/Schema"
import * as Context from "effect/Context"

export class Todo extends Schema.Class<Todo>("Todo")({
  id: Schema.String,
  title: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  userId: Schema.String,
}) {}

export class CreateTodoInput extends Schema.Class<CreateTodoInput>("CreateTodoInput")({
  title: Schema.NonEmptyString,
  userId: Schema.String,
}) {}

export class UpdateTodoInput extends Schema.Class<UpdateTodoInput>("UpdateTodoInput")({
  id: Schema.String,
  title: Schema.optionalWith(Schema.NonEmptyString, { nullable: true }),
  completed: Schema.optionalWith(Schema.Boolean, { nullable: true }),
}) {}

export class TodoNotFound extends Schema.TaggedError<TodoNotFound>()("TodoNotFound", {
  id: Schema.String,
}) {}

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, { id: string; name: string }>() {}