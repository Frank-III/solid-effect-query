import { Effect, Ref, Stream, Array } from "effect"
import { Todo, TodoNotFound, CurrentUser } from "../domain/Todo"
import * as DateTime from "effect/DateTime"
import * as Schema from "effect/Schema"

export class TodoService extends Effect.Service<TodoService>()("TodoService", {
  effect: Effect.gen(function* () {
    // In-memory storage for demo
    const todosRef = yield* Ref.make<Todo[]>([])
    const subscribers = yield* Ref.make<Set<(todo: Todo) => void>>(new Set())

    const notifySubscribers = (todo: Todo) =>
      Effect.gen(function* () {
        const subs = yield* Ref.get(subscribers)
        yield* Effect.forEach(
          subs,
          (callback) => Effect.sync(() => callback(todo)),
          { discard: true }
        )
      })

    const getAll = Effect.gen(function* () {
      const currentUser = yield* CurrentUser
      const todos = yield* Ref.get(todosRef)
      return todos.filter((todo) => todo.userId === currentUser.id)
    })

    const getById = (id: string) =>
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser
        const todos = yield* Ref.get(todosRef)
        const todo = todos.find((t) => t.id === id && t.userId === currentUser.id)
        if (!todo) {
          return yield* new TodoNotFound({ id })
        }
        return todo
      })

    const create = (title: string) =>
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser
        const now = yield* DateTime.now
        const todo = new Todo({
          id: Schema.decodeSync(Schema.UUID)(crypto.randomUUID()),
          title,
          completed: false,
          createdAt: now,
          updatedAt: now,
          userId: currentUser.id,
        })
        yield* Ref.update(todosRef, Array.append(todo))
        yield* notifySubscribers(todo)
        return todo
      })

    const update = (id: string, updates: { title?: string; completed?: boolean }) =>
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser
        const now = yield* DateTime.now
        const todos = yield* Ref.get(todosRef)
        const index = todos.findIndex((t) => t.id === id && t.userId === currentUser.id)
        
        if (index === -1) {
          return yield* new TodoNotFound({ id })
        }

        const updated = new Todo({
          ...todos[index],
          ...(updates.title !== undefined && { title: updates.title }),
          ...(updates.completed !== undefined && { completed: updates.completed }),
          updatedAt: now,
        })

        yield* Ref.update(todosRef, Array.modify(index, () => updated))
        yield* notifySubscribers(updated)
        return updated
      })

    const remove = (id: string) =>
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser
        const todos = yield* Ref.get(todosRef)
        const index = todos.findIndex((t) => t.id === id && t.userId === currentUser.id)
        
        if (index === -1) {
          return yield* new TodoNotFound({ id })
        }

        yield* Ref.update(todosRef, Array.remove(index))
      })

    const watchChanges = Stream.async<Todo>((emit) => {
      const callback = (todo: Todo) => emit.single(todo)
      
      return Effect.gen(function* () {
        yield* Ref.update(subscribers, (set) => {
          const newSet = new Set(set)
          newSet.add(callback)
          return newSet
        })

        return Effect.sync(() => {
          Effect.runSync(Ref.update(subscribers, (set) => {
            const newSet = new Set(set)
            newSet.delete(callback)
            return newSet
          }))
        })
      })
    })

    // Seed some initial data
    yield* Effect.gen(function* () {
      const user1Todos = [
        { title: "Learn Effect", completed: true },
        { title: "Build RPC server", completed: true },
        { title: "Create SolidJS demo", completed: false },
      ]

      for (const { title, completed } of user1Todos) {
        const now = yield* DateTime.now
        const todo = new Todo({
          id: Schema.decodeSync(Schema.UUID)(crypto.randomUUID()),
          title,
          completed,
          createdAt: now,
          updatedAt: now,
          userId: "user1",
        })
        yield* Ref.update(todosRef, Array.append(todo))
      }
    })

    return {
      getAll,
      getById,
      create,
      update,
      remove,
      watchChanges,
    }
  }),
}) {}