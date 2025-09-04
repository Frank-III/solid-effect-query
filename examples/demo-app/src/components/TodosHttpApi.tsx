import { For, Show, createSignal, onCleanup } from "solid-js";
import {
  makeHttpApiHooks,
} from "solid-effect-query-http-api";
import { HttpApi, Todo } from "../api/httpapi";
import { useQueryClient } from "@tanstack/solid-query";
import { ManagedRuntime } from "effect";
import { FetchHttpClient } from "@effect/platform";

export function TodosHttpApi() {
  const [newTodoTitle, setNewTodoTitle] = createSignal("");
  const [selectedTodoId, setSelectedTodoId] = createSignal<number | null>(null);
  const queryClient = useQueryClient();

  // Create a runtime with the FetchHttpClient layer for browser environments
  const runtime = ManagedRuntime.make(FetchHttpClient.layer);
  onCleanup(() => {
    runtime.dispose();
  });

  // Create the HTTP API hook set with shared runtime (v2 factory)
  const { useQuery: useHttpQuery, useMutation: useHttpMutation } = makeHttpApiHooks(HttpApi, {
    baseUrl: "http://localhost:3001",
    runtime,
  });

  // Query all todos
  const todosQuery = useHttpQuery("todos", "getAllTodos", () => ({
    staleTime: 30000,
    onError: (error) => {
      console.error("[TodosHttpApi] getAllTodos error:", error);
    },
  }));

  // Query selected todo
  const todoQuery = useHttpQuery("todos", "getTodo", () => ({
    path: { id: selectedTodoId()! },
    enabled: selectedTodoId() !== null,
    onError: (error) => {
      console.error("[TodosHttpApi] getTodo error:", error);
    },
  }));

  // Create todo mutation
  const createTodoMutation = useHttpMutation("todos", "createTodo", () => ({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["httpApi", "todos", "getAllTodos"],
      });
      setNewTodoTitle("");
    },
    onError: (error) => {
      console.error("Failed to create todo:", error);
    },
  }));

  // Update todo mutation
  const updateTodoMutation = useHttpMutation("todos", "updateTodo", () => ({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["httpApi", "todos"] });
    },
  }));

  // Delete todo mutation
  const deleteTodoMutation = useHttpMutation("todos", "deleteTodo", () => ({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["httpApi", "todos", "getAllTodos"],
      });
      setSelectedTodoId(null);
    },
  }));

  const handleCreateTodo = (e: Event) => {
    e.preventDefault();
    if (newTodoTitle().trim()) {
      createTodoMutation.mutate({
        payload: {
          title: newTodoTitle(),
          userId: 1, // Mock user ID
        },
      });
    }
  };

  const handleToggleTodo = (todo: Todo) => {
    updateTodoMutation.mutate({
      path: { id: todo.id },
      payload: {
        completed: !todo.completed,
      },
    });
  };

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-2">HTTP API Todo Demo</h2>
      <p class="text-gray-600 text-sm mb-4">
        Using Effect Platform HTTP API with solid-effect-query-http-api
      </p>

      <div class="space-y-6">
        {/* Create Todo Form */}
        <form onSubmit={handleCreateTodo} class="flex gap-2">
          <input
            type="text"
            value={newTodoTitle()}
            onInput={(e) => setNewTodoTitle(e.currentTarget.value)}
            placeholder="What needs to be done?"
            class="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={createTodoMutation.isPending}
          />
          <button
            type="submit"
            disabled={createTodoMutation.isPending || !newTodoTitle().trim()}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createTodoMutation.isPending ? "Adding..." : "Add Todo"}
          </button>
        </form>

        <div class="grid grid-cols-2 gap-6">
          {/* Todos List */}
          <div>
            <h3 class="text-lg font-medium mb-3">Todo List</h3>

            <Show when={todosQuery.isLoading}>
              <div class="space-y-2">
                {[1, 2, 3].map(() => (
                  <div class="animate-pulse">
                    <div class="h-12 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </Show>

            <Show when={todosQuery.isError}>
              <div class="text-red-500 bg-red-50 p-3 rounded">
                Error loading todos
              </div>
            </Show>

            <Show when={todosQuery.data}>
              <div class="space-y-2">
                <For each={todosQuery.data}>
                  {(todo) => (
                    <div
                      class={`p-3 rounded cursor-pointer transition-all ${
                        selectedTodoId() === todo.id
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => setSelectedTodoId(todo.id)}
                    >
                      <div class="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleTodo(todo);
                          }}
                          class="w-4 h-4 cursor-pointer"
                          disabled={updateTodoMutation.isPending}
                        />
                        <span
                          class={`flex-1 ${
                            todo.completed ? "line-through text-gray-400" : ""
                          }`}
                        >
                          {todo.title}
                        </span>
                      </div>
                    </div>
                  )}
                </For>
                {(todosQuery.data?.length || 0) === 0 && (
                  <p class="text-gray-400 text-center py-8">
                    No todos yet. Add one above!
                  </p>
                )}
              </div>
            </Show>
          </div>

          {/* Todo Details */}
          <div>
            <h3 class="text-lg font-medium mb-3">Todo Details</h3>

            <Show when={!selectedTodoId()}>
              <p class="text-gray-500">Select a todo to view details</p>
            </Show>

            <Show when={todoQuery.isLoading}>
              <div class="animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div class="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </Show>

            <Show when={todoQuery.data}>
              {(todo) => (
                <div class="bg-gray-50 p-4 rounded">
                  <h4 class="font-semibold text-lg mb-2">{todo().title}</h4>
                  <div class="space-y-1 text-sm">
                    <p>
                      <span class="font-medium">ID:</span> {todo().id}
                    </p>
                    <p>
                      <span class="font-medium">Status:</span>{" "}
                      <span
                        class={`inline-block px-2 py-1 rounded text-xs ${
                          todo().completed
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {todo().completed ? "Completed" : "Pending"}
                      </span>
                    </p>
                    <p>
                      <span class="font-medium">User ID:</span> {todo().userId}
                    </p>
                  </div>

                  <div class="flex gap-2 mt-4">
                    <button
                      onClick={() => handleToggleTodo(todo())}
                      disabled={updateTodoMutation.isPending}
                      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {updateTodoMutation.isPending
                        ? "Updating..."
                        : todo().completed
                          ? "Mark as Pending"
                          : "Mark as Complete"}
                    </button>
                    <button
                      onClick={() =>
                        deleteTodoMutation.mutate({
                          path: { id: todo().id },
                        })
                      }
                      disabled={deleteTodoMutation.isPending}
                      class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {deleteTodoMutation.isPending ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
