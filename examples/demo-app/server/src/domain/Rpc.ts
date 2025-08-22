import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as Rpc from "@effect/rpc/Rpc"
import * as Schema from "effect/Schema"
import { Todo } from "./Todo"
import { AuthMiddleware } from "./Auth"

export class TodoRpcs extends RpcGroup.make(
  Rpc.make("getTodos", {
    payload: {
      completed: Schema.optional(Schema.Boolean),
    },
    success: Schema.Array(Todo),
  }),
  Rpc.make("getTodo", {
    payload: {
      id: Schema.String,
    },
    success: Todo,
  }),
  Rpc.make("createTodo", {
    payload: {
      title: Schema.NonEmptyString,
      userId: Schema.String,
    },
    success: Todo,
  }),
  Rpc.make("updateTodo", {
    payload: {
      id: Schema.String,
      title: Schema.optional(Schema.NonEmptyString),
      completed: Schema.optional(Schema.Boolean),
    },
    success: Todo,
  }),
  Rpc.make("deleteTodo", {
    payload: {
      id: Schema.String,
    },
    success: Schema.Void,
  }),
  Rpc.make("watchTodos", {
    stream: true,
    success: Todo,
  }),
).middleware(AuthMiddleware) {}

// Analytics RPC group without auth
export class AnalyticsRpcs extends RpcGroup.make(
  Rpc.make("trackEvent", {
    payload: {
      event: Schema.String,
      properties: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    },
    success: Schema.Void,
  }),
  Rpc.make("getStats", {
    success: Schema.Struct({
      totalTodos: Schema.Number,
      completedTodos: Schema.Number,
      activeTodos: Schema.Number,
      totalUsers: Schema.Number,
    }),
  }),
) {}