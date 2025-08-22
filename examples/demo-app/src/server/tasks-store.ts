import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Ref from 'effect/Ref'
import * as Option from 'effect/Option'
import { Task } from '../api/tasks.rpc'

export class TaskNotFoundError extends Error {
  readonly _tag = 'TaskNotFoundError'
  constructor(readonly id: string) {
    super(`Task with id ${id} not found`)
  }
}

export class TasksStore extends Effect.Service<TasksStore>()('TasksStore', {
  effect: Effect.gen(function* () {
    const store = yield* Ref.make(HashMap.empty<string, Task>())
    
    const seedTasks: Task[] = [
      { id: '1', title: 'Learn Effect', completed: false, createdAt: new Date() },
      { id: '2', title: 'Build with solid-effect-query', completed: false, createdAt: new Date() },
      { id: '3', title: 'Create RPC services', completed: true, createdAt: new Date() }
    ]
    
    yield* Ref.update(store, (map) =>
      seedTasks.reduce((acc, task) => HashMap.set(acc, task.id, task), map)
    )
    
    return {
      getAll: Effect.gen(function* () {
        const map = yield* Ref.get(store)
        return Array.from(HashMap.values(map))
      }),
      
      getById: (id: string) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(store)
          const task = HashMap.get(map, id)
          return Option.match(task, {
            onNone: () => Effect.fail(new TaskNotFoundError(id)),
            onSome: (task) => Effect.succeed(task)
          })
        }).pipe(Effect.flatten),
      
      create: (title: string) =>
        Effect.gen(function* () {
          const task: Task = {
            id: crypto.randomUUID(),
            title,
            completed: false,
            createdAt: new Date()
          }
          yield* Ref.update(store, (map) => HashMap.set(map, task.id, task))
          return task
        }),
      
      update: (id: string, updates: { title?: string; completed?: boolean }) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(store)
          const existing = HashMap.get(map, id)
          
          if (Option.isNone(existing)) {
            return yield* Effect.fail(new TaskNotFoundError(id))
          }
          
          const updated: Task = {
            ...existing.value,
            ...(updates.title !== undefined && { title: updates.title }),
            ...(updates.completed !== undefined && { completed: updates.completed })
          }
          
          yield* Ref.update(store, (map) => HashMap.set(map, id, updated))
          return updated
        }),
      
      delete: (id: string) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(store)
          const exists = HashMap.has(map, id)
          
          if (exists) {
            yield* Ref.update(store, (map) => HashMap.remove(map, id))
          }
          
          return { success: exists }
        })
    }
  })
}) {}