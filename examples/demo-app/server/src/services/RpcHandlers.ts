import { Effect, Layer, Stream } from "effect"
import { TodoRpcs, AnalyticsRpcs } from "../domain/Rpc"
import { TodoService } from "./TodoService"
import { CurrentUser } from "../domain/Todo"

// Todo handlers
export const TodoHandlers = TodoRpcs.toLayer(
  Effect.gen(function* () {
    const todoService = yield* TodoService
    
    return TodoRpcs.of({
      getTodos: Effect.fnUntraced(function* ({ completed }) {
        const todos = yield* todoService.getAll
        if (completed === undefined) {
          return todos
        }
        return todos.filter((todo) => todo.completed === completed)
      }),
      
      getTodo: ({ id }) => todoService.getById(id).pipe(Effect.orDie),
      
      createTodo: ({ title }) => todoService.create(title).pipe(Effect.orDie),
      
      updateTodo: ({ id, title, completed }) =>
        todoService.update(id, { title, completed }).pipe(Effect.orDie),
      
      deleteTodo: ({ id }) => todoService.remove(id).pipe(Effect.orDie),
      
      watchTodos: () =>
        Effect.gen(function* () {
          const currentUser = yield* CurrentUser
          return todoService.watchChanges.pipe(
            Stream.filter((todo) => todo.userId === currentUser.id)
          )
        }).pipe(Stream.unwrap),
    })
  })
).pipe(Layer.provide(TodoService.Default))

// Analytics handlers (no auth required)
export const AnalyticsHandlers = AnalyticsRpcs.toLayer(
  Effect.gen(function* () {
    const todoService = yield* TodoService
    
    return AnalyticsRpcs.of({
      trackEvent: ({ event, properties }) =>
        Effect.sync(() => {
          console.log(`[Analytics] Event: ${event}`, properties)
        }),
      
      getStats: () =>
        Effect.gen(function* () {
          // Provide a fake user context for stats
          const todos = yield* Effect.provide(
            todoService.getAll,
            Layer.succeed(CurrentUser, { id: "user1", name: "Demo User" })
          )
          
          const totalTodos = todos.length
          const completedTodos = todos.filter((t) => t.completed).length
          const activeTodos = totalTodos - completedTodos
          
          return {
            totalTodos,
            completedTodos,
            activeTodos,
            totalUsers: 1, // Mock value
          }
        }),
    })
  })
).pipe(Layer.provide(TodoService.Default))