import { type Component, createSignal, For, Show } from 'solid-js'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools'
import { makeEffectRuntime, Effect, Layer } from 'solid-effect-query'
import { Context } from 'effect'
import { UserListFactory } from './components/UserListFactory'
import { TodosHttpApi } from './components/TodosHttpApi'
import { TaskListRpc } from './components/TaskListRpc'
import { EnvironmentDemo } from './components/EnvironmentDemo'
import { EffectQueryDemo } from './components/EffectQueryDemo'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  }
})

// ============= Services =============

// User Stats Service
interface UserStatsService {
  readonly getStats: (userId: number) => Effect.Effect<{
    userId: number
    posts: number
    followers: number
    following: number
  }>
}

const UserStatsService = Context.GenericTag<UserStatsService>("UserStatsService")

const UserStatsServiceLive = Layer.succeed(
  UserStatsService,
  {
    getStats: (userId: number) => 
      Effect.gen(function* () {
        yield* Effect.sleep("300 millis")
        yield* Effect.log(`Fetching stats for user ${userId}`)
        return {
          userId,
          posts: Math.floor(Math.random() * 100) + 10,
          followers: Math.floor(Math.random() * 1000) + 100,
          following: Math.floor(Math.random() * 500) + 50
        }
      })
  }
)

// Todo Service
interface Todo {
  id: number
  title: string
  completed: boolean
  userId: number
}

interface TodoService {
  readonly getAll: () => Effect.Effect<Todo[]>
  readonly create: (title: string, userId: number) => Effect.Effect<Todo>
  readonly delete: (id: number) => Effect.Effect<void>
  readonly toggle: (id: number) => Effect.Effect<Todo, "TodoNotFound">
}

const TodoService = Context.GenericTag<TodoService>("TodoService")

// In-memory todo storage
let todos: Todo[] = [
  { id: 1, title: "Learn Effect", completed: true, userId: 1 },
  { id: 2, title: "Build with solid-effect-query", completed: false, userId: 1 },
  { id: 3, title: "Deploy to production", completed: false, userId: 1 }
]
let nextId = 4

const TodoServiceLive = Layer.succeed(
  TodoService,
  {
    getAll: () => 
      Effect.gen(function* () {
        yield* Effect.sleep("200 millis")
        yield* Effect.log("Fetching all todos")
        return todos
      }),
    
    create: (title: string, userId: number) =>
      Effect.gen(function* () {
        yield* Effect.sleep("100 millis")
        const todo: Todo = { 
          id: nextId++, 
          title, 
          completed: false, 
          userId 
        }
        todos = [...todos, todo]
        yield* Effect.log(`Created todo: ${title}`)
        return todo
      }),
    
    delete: (id: number) =>
      Effect.gen(function* () {
        yield* Effect.sleep("100 millis")
        todos = todos.filter(t => t.id !== id)
        yield* Effect.log(`Deleted todo ${id}`)
      }),
    
    toggle: (id: number) =>
      Effect.gen(function* () {
        yield* Effect.sleep("100 millis")
        const todo = todos.find(t => t.id === id)
        if (!todo) {
          return yield* Effect.fail("TodoNotFound" as const)
        }
        const updated: Todo = { ...todo, completed: !todo.completed }
        todos = todos.map(t => t.id === id ? updated : t)
        yield* Effect.log(`Toggled todo ${id}`)
        return updated
      })
  }
)

// Weather Service
interface WeatherService {
  readonly getWeather: (city: string) => Effect.Effect<{
    city: string
    temp: number
    condition: string
    humidity: number
  }, "NetworkError" | "CityNotFound">
}

const WeatherService = Context.GenericTag<WeatherService>("WeatherService")

const WeatherServiceLive = Layer.succeed(
  WeatherService,
  {
    getWeather: (city: string) =>
      Effect.gen(function* () {
        yield* Effect.log(`Fetching weather for ${city}`)
        
        // Simulate API call
        yield* Effect.sleep("500 millis")
        
        // Simulate some cities not found
        if (city.toLowerCase() === "atlantis") {
          return yield* Effect.fail("CityNotFound" as const)
        }
        
        // Simulate random network errors
        if (Math.random() < 0.1) {
          return yield* Effect.fail("NetworkError" as const)
        }
        
        return {
          city,
          temp: Math.floor(Math.random() * 30) + 10,
          condition: ["Sunny", "Cloudy", "Rainy", "Windy"][Math.floor(Math.random() * 4)],
          humidity: Math.floor(Math.random() * 40) + 40
        }
      })
  }
)

// ============= Create Effect Runtime =============

const MainLayer = Layer.mergeAll(
  UserStatsServiceLive,
  TodoServiceLive,
  WeatherServiceLive
)

const { Provider, useEffectQuery, useEffectMutation } = makeEffectRuntime(() => MainLayer)

// ============= Components =============

const UserStatsExample: Component = () => {
  const [userId, setUserId] = createSignal(1)
  
  const userStats = useEffectQuery(() => ({
    queryKey: ['userStats', userId()],
    queryFn: () => Effect.gen(function* () {
      const service = yield* UserStatsService
      return yield* service.getStats(userId())
    })
  }))

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">User Statistics</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">User ID:</label>
          <input
            type="number"
            value={userId()}
            onInput={(e) => setUserId(parseInt(e.currentTarget.value) || 1)}
            min="1"
            class="px-3 py-2 border rounded-md w-full max-w-xs"
          />
        </div>
        <Show
          when={!userStats.isPending}
          fallback={
            <div class="animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-28"></div>
            </div>
          }
        >
          <Show when={userStats.isSuccess}>
            <div class="space-y-2 bg-gray-50 p-4 rounded">
              <p class="flex justify-between">
                <span class="font-medium">Posts:</span> 
                <span class="font-mono">{userStats.data?.posts}</span>
              </p>
              <p class="flex justify-between">
                <span class="font-medium">Followers:</span> 
                <span class="font-mono">{userStats.data?.followers}</span>
              </p>
              <p class="flex justify-between">
                <span class="font-medium">Following:</span> 
                <span class="font-mono">{userStats.data?.following}</span>
              </p>
            </div>
          </Show>
          <Show when={userStats.isError}>
            <div class="text-red-500 bg-red-50 p-3 rounded">
              Error loading stats
            </div>
          </Show>
        </Show>
      </div>
    </div>
  )
}

const TodoExample: Component = () => {
  const [newTodoTitle, setNewTodoTitle] = createSignal("")
  
  const todos = useEffectQuery(() => ({
    queryKey: ['todos'],
    queryFn: () => Effect.gen(function* () {
      const service = yield* TodoService
      return yield* service.getAll()
    })
  }))
  
  const createTodo = useEffectMutation(() => ({
    mutationFn: ({ title, userId }: { title: string, userId: number }) => 
      Effect.gen(function* () {
        const service = yield* TodoService
        return yield* service.create(title, userId)
      }),
    onSuccess: () => Effect.gen(function* () {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      setNewTodoTitle("")
    })
  }))
  
  const deleteTodo = useEffectMutation(() => ({
    mutationFn: (id: number) => 
      Effect.gen(function* () {
        const service = yield* TodoService
        yield* service.delete(id)
      }),
    onSuccess: () => Effect.gen(function* () {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    })
  }))
  
  const toggleTodo = useEffectMutation(() => ({
    mutationFn: (id: number) => 
      Effect.gen(function* () {
        const service = yield* TodoService
        return yield* service.toggle(id)
      }),
    onSuccess: () => Effect.gen(function* () {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    })
  }))

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Todo List</h2>
      
      <div class="space-y-4">
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            if (newTodoTitle().trim()) {
              createTodo.mutate({ title: newTodoTitle(), userId: 1 })
            }
          }}
          class="flex gap-2"
        >
          <input
            type="text"
            value={newTodoTitle()}
            onInput={(e) => setNewTodoTitle(e.currentTarget.value)}
            placeholder="What needs to be done?"
            class="flex-1 px-3 py-2 border rounded-md"
            disabled={createTodo.isPending}
          />
          <button
            type="submit"
            disabled={createTodo.isPending || !newTodoTitle().trim()}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createTodo.isPending ? "Adding..." : "Add Todo"}
          </button>
        </form>
        
        <Show
          when={!todos.isPending}
          fallback={
            <div class="space-y-2">
              {[1, 2, 3].map(() => (
                <div class="animate-pulse flex items-center p-3 border rounded">
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          }
        >
          <Show when={todos.isSuccess}>
            <div class="space-y-2">
              <For each={todos.data || []}>
                {(todo) => (
                  <div class="flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition-colors">
                    <div class="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo.mutate(todo.id)}
                        class="w-4 h-4 cursor-pointer"
                        disabled={toggleTodo.isPending}
                      />
                      <span 
                        class={`${todo.completed ? "line-through text-gray-400" : ""} transition-all`}
                        onClick={() => toggleTodo.mutate(todo.id)}
                        style={{ cursor: "pointer" }}
                      >
                        {todo.title}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteTodo.mutate(todo.id)}
                      disabled={deleteTodo.isPending}
                      class="px-3 py-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </For>
              {(todos.data?.length || 0) === 0 && (
                <p class="text-gray-400 text-center py-8">No todos yet. Add one above!</p>
              )}
            </div>
          </Show>
          <Show when={todos.isError}>
            <div class="text-red-500 bg-red-50 p-3 rounded">
              Error loading todos
            </div>
          </Show>
        </Show>
      </div>
    </div>
  )
}

const WeatherExample: Component = () => {
  const [city, setCity] = createSignal("London")
  const [inputCity, setInputCity] = createSignal("London")
  
  const weather = useEffectQuery(() => ({
    queryKey: ['weather', city()],
    queryFn: () => Effect.gen(function* () {
      const service = yield* WeatherService
      return yield* service.getWeather(city())
    }),
    throwOnDefect: true, // This will expose the actual error instead of the Cause
    retry: false
  }))

  const handleSearch = (e: Event) => {
    e.preventDefault()
    if (inputCity().trim()) {
      setCity(inputCity().trim())
    }
  }

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Weather Service</h2>
      
      <form onSubmit={handleSearch} class="mb-6">
        <div class="flex gap-2">
          <input
            type="text"
            value={inputCity()}
            onInput={(e) => setInputCity(e.currentTarget.value)}
            placeholder="Enter city name"
            class="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Search
          </button>
        </div>
        <p class="text-sm text-gray-500 mt-1">Try "Atlantis" for a not found error</p>
      </form>
      
      <Show
        when={!weather.isPending}
        fallback={
          <div class="animate-pulse space-y-3">
            <div class="h-8 bg-gray-200 rounded w-32"></div>
            <div class="h-4 bg-gray-200 rounded w-24"></div>
            <div class="h-4 bg-gray-200 rounded w-28"></div>
          </div>
        }
      >
        <Show when={weather.isSuccess}>
          <div class="bg-blue-50 p-4 rounded space-y-2">
            <h3 class="text-2xl font-bold">{weather.data?.city}</h3>
            <p class="text-3xl">{weather.data?.temp}°C</p>
            <p class="text-lg text-gray-600">{weather.data?.condition}</p>
            <p class="text-sm text-gray-500">Humidity: {weather.data?.humidity}%</p>
          </div>
        </Show>
        <Show when={weather.isError}>
          <div class="bg-red-50 p-4 rounded">
            <p class="text-red-600 font-medium">
              {weather.error === "CityNotFound" 
                ? "City not found. Please try another city."
                : weather.error === "NetworkError"
                ? "Network error. Please try again later."
                : "An unexpected error occurred."}
            </p>
          </div>
        </Show>
      </Show>
    </div>
  )
}

const ErrorHandlingExample: Component = () => {
  const [throwOnDefect, setThrowOnDefect] = createSignal(false)
  
  const riskyQuery = useEffectQuery(() => ({
    queryKey: ['risky', throwOnDefect()],
    queryFn: () => Effect.gen(function* () {
      yield* Effect.log("Running risky operation")
      
      const random = Math.random()
      if (random < 0.33) {
        return yield* Effect.fail("BusinessError" as const)
      } else if (random < 0.66) {
        // This simulates a defect (unexpected error)
        throw new Error("Unexpected runtime error!")
      }
      
      return "Success! 🎉"
    }),
    throwOnDefect: throwOnDefect(),
    retry: false
  }))

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Error Handling</h2>
      
      <div class="mb-4">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={throwOnDefect()}
            onChange={(e) => setThrowOnDefect(e.currentTarget.checked)}
            class="w-4 h-4"
          />
          <span>Throw on defect (expose actual errors)</span>
        </label>
        <p class="text-sm text-gray-500 mt-1">
          When disabled, errors are wrapped in Effect.Cause. When enabled, only expected errors are exposed.
        </p>
      </div>
      
      <button
        onClick={() => queryClient.invalidateQueries({ queryKey: ['risky'] })}
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
      >
        Retry Query
      </button>
      
      <div class="space-y-2">
        <p class="text-sm">
          <span class="font-medium">Status:</span> {riskyQuery.status}
        </p>
        
        <Show when={riskyQuery.isSuccess}>
          <div class="bg-green-50 p-3 rounded text-green-700">
            {riskyQuery.data}
          </div>
        </Show>
        
        <Show when={riskyQuery.isError}>
          <div class="bg-red-50 p-3 rounded">
            <p class="text-red-600 font-medium mb-2">Error occurred:</p>
            <pre class="text-xs overflow-auto bg-red-100 p-2 rounded">
              {JSON.stringify(riskyQuery.error, null, 2)}
            </pre>
            <Show when={!throwOnDefect()}>
              <p class="text-sm text-gray-600 mt-2">
                This is an Effect.Cause object containing the full error context
              </p>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}

// ============= Main App =============

export function App() {
  const [activeTab, setActiveTab] = createSignal<"stats" | "todos" | "weather" | "errors" | "httpapi" | "users" | "rpc" | "environment" | "simple">("simple")
  
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <div class="min-h-screen bg-gray-100">
          <div class="container mx-auto py-8 px-4 max-w-4xl">
            <div class="mb-8">
              <h1 class="text-3xl font-bold mb-2">Solid Effect Query Demo</h1>
              <p class="text-gray-600">
                Demonstrating the new makeEffectRuntime API with services and layers
              </p>
            </div>
            
            <div class="mb-6">
              <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab("todos")}
                    class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab() === "todos"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Todo List
                  </button>
                  <button
                    onClick={() => setActiveTab("stats")}
                    class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab() === "stats"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    User Stats
                  </button>
                  <button
                    onClick={() => setActiveTab("weather")}
                    class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab() === "weather"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Weather
                  </button>
                  <button
                    onClick={() => setActiveTab("errors")}
                    class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab() === "errors"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Error Handling
                  </button>
                  <button
                    onClick={() => setActiveTab("httpapi")}
                    class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab() === "httpapi"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    HTTP API
                  </button>
                  <button
                    onClick={() => setActiveTab("users")}
                    class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab() === "users"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Users API
                  </button>
                  <button
                    onClick={() => setActiveTab("rpc")}
                    class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab() === "rpc"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    RPC Tasks
                  </button>
                  <button
                    onClick={() => setActiveTab("environment")}
                    class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab() === "environment"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Environment
                  </button>
                  <button
                    onClick={() => setActiveTab("simple")}
                    class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab() === "simple"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Simple API
                  </button>
                </nav>
              </div>
            </div>
            
            <div class="mb-8">
              <Show when={activeTab() === "todos"}>
                <TodoExample />
              </Show>
              <Show when={activeTab() === "stats"}>
                <UserStatsExample />
              </Show>
              <Show when={activeTab() === "weather"}>
                <WeatherExample />
              </Show>
              <Show when={activeTab() === "errors"}>
                <ErrorHandlingExample />
              </Show>
              <Show when={activeTab() === "httpapi"}>
                <TodosHttpApi />
              </Show>
              <Show when={activeTab() === "users"}>
                <UserListFactory />
              </Show>
              <Show when={activeTab() === "rpc"}>
                <TaskListRpc />
              </Show>
              <Show when={activeTab() === "environment"}>
                <EnvironmentDemo />
              </Show>
              <Show when={activeTab() === "simple"}>
                <EffectQueryDemo />
              </Show>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
              <h2 class="text-lg font-semibold mb-3">About this Demo</h2>
              <div class="space-y-2 text-sm text-gray-600">
                <p>
                  This demo showcases the new <code class="bg-gray-100 px-1 rounded">makeEffectRuntime</code> API 
                  which provides a clean way to manage Effect services with layers.
                </p>
                <p>
                  Each service is defined using <code class="bg-gray-100 px-1 rounded">Context.GenericTag</code> and 
                  implemented with layers. The runtime is created once and provides all services to the hooks.
                </p>
                <p>
                  The <code class="bg-gray-100 px-1 rounded">throwOnDefect</code> option controls error handling - 
                  when enabled, only expected errors are exposed while defects throw.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Provider>
      <SolidQueryDevtools />
    </QueryClientProvider>
  )
}