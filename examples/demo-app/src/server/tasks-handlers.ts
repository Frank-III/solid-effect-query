import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { TasksRpc } from '../api/tasks.rpc'
import { TasksStore } from './tasks-store'

export const TasksHandlers = TasksRpc.toLayer(
  Effect.gen(function* () {
    const store = yield* TasksStore
    
    return {
      getTasks: () => store.getAll,
      
      getTask: ({ id }) => store.getById(id).pipe(
        Effect.mapError(error => error.message)
      ),
      
      createTask: ({ title }) => store.create(title),
      
      updateTask: ({ id, title, completed }) => 
        store.update(id, { title, completed }).pipe(
          Effect.mapError(error => error.message)
        ),
      
      deleteTask: ({ id }) => store.delete(id)
    }
  })
).pipe(
  Layer.provide(TasksStore.Default)
)