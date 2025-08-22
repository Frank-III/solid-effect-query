import { createSignal, For, Show } from 'solid-js'
import { useTasksQuery, useTasksMutation } from '../client/tasks-client'
import { useQueryClient } from '@tanstack/solid-query'

export function TaskListRpc() {
  const [newTaskTitle, setNewTaskTitle] = createSignal('')
  const queryClient = useQueryClient()
  
  const tasksQuery = useTasksQuery('getTasks', () => ({}))
  
  const createTaskMutation = useTasksMutation('createTask', () => ({
    onSuccess: () => {
      setNewTaskTitle('')
      queryClient.invalidateQueries({ queryKey: ['tasks.rpc'] })
    }
  }))
  
  const updateTaskMutation = useTasksMutation('updateTask', () => ({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks.rpc'] })
    }
  }))
  
  const deleteTaskMutation = useTasksMutation('deleteTask', () => ({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks.rpc'] })
    }
  }))
  
  const handleAddTask = (e: Event) => {
    e.preventDefault()
    const title = newTaskTitle().trim()
    if (title) {
      createTaskMutation.mutate({ title })
    }
  }
  
  const toggleTask = (id: string, completed: boolean) => {
    updateTaskMutation.mutate({ id, completed: !completed })
  }
  
  const deleteTask = (id: string) => {
    deleteTaskMutation.mutate({ id })
  }
  
  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-2">RPC Task Manager</h2>
      <p class="text-gray-600 text-sm mb-4">
        Using Effect RPC with solid-effect-query-rpc
      </p>
      
      <form onSubmit={handleAddTask} class="mb-6">
        <div class="flex gap-2">
          <input
            type="text"
            value={newTaskTitle()}
            onInput={(e) => setNewTaskTitle(e.currentTarget.value)}
            placeholder="Add a new task..."
            class="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={createTaskMutation.isPending}
          />
          <button
            type="submit"
            disabled={createTaskMutation.isPending || !newTaskTitle().trim()}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </form>
      
      <Show when={tasksQuery.isLoading}>
        <div class="space-y-2">
          {[1, 2, 3].map(() => (
            <div class="animate-pulse">
              <div class="h-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </Show>
      
      <Show when={tasksQuery.isError}>
        <div class="text-red-500 bg-red-50 p-3 rounded">
          Error loading tasks
        </div>
      </Show>
      
      <Show when={tasksQuery.data}>
        <div>
          <Show when={tasksQuery.data?.length === 0}>
            <p class="text-gray-400 text-center py-8">
              No tasks yet. Add one above!
            </p>
          </Show>
          
          <div class="space-y-2">
            <For each={tasksQuery.data}>
              {(task) => (
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                  <div class="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id, task.completed)}
                      class="w-4 h-4 cursor-pointer"
                      disabled={updateTaskMutation.isPending}
                    />
                    <span
                      class={`${
                        task.completed ? 'line-through text-gray-400' : 'text-gray-700'
                      } transition-all cursor-pointer`}
                      onClick={() => toggleTask(task.id, task.completed)}
                    >
                      {task.title}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => deleteTask(task.id)}
                    disabled={deleteTaskMutation.isPending}
                    class="px-3 py-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  )
}