import * as Rpc from '@effect/rpc/Rpc'
import * as RpcGroup from '@effect/rpc/RpcGroup'
import * as Schema from 'effect/Schema'

// Task schema
export const Task = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.Date
})

export type Task = Schema.Schema.Type<typeof Task>

// RPC definitions
export class TasksRpc extends RpcGroup.make(
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
) {}