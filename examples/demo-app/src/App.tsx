import { createSignal, Show } from 'solid-js'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools'

// Import demo components for the three packages
import { SimpleEffectQueryDemo } from './components/SimpleEffectQueryDemo'
import { BasicEffectQuery } from './components/BasicEffectQuery'
import { NoRuntimeQuery } from './components/NoRuntimeQuery'
import { TodosHttpApi } from './components/TodosHttpApi'
import { RpcDemo } from './components/RpcDemo'
import { DebugConsole } from './components/DebugConsole'
import { TestRuntime } from './components/TestRuntime'
import { PlatformBrowserHttpDemo } from './components/PlatformBrowserHttpDemo'
import { TestInfiniteLoop } from './components/TestInfiniteLoop'
import { TestLocalsError } from './components/TestLocalsError'
import { TestRuntimeDebug } from './components/TestRuntimeDebug'
import { TestMinimal } from './components/TestMinimal'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  }
})

export function App() {
  const [activeTab, setActiveTab] = createSignal<"basic" | "httpapi" | "rpc">("basic")
  
  return (
    <QueryClientProvider client={queryClient}>
      <div class="min-h-screen bg-gray-100">
        <div class="container mx-auto py-8 px-4 max-w-6xl">
          <div class="mb-8">
            <h1 class="text-3xl font-bold mb-2">Solid Effect Query Packages Demo</h1>
            <p class="text-gray-600">
              Demonstrating the three packages: solid-effect-query, solid-effect-query-http-api, and solid-effect-query-rpc
            </p>
          </div>
          
          <div class="mb-6">
            <div class="border-b border-gray-200">
              <nav class="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("basic")}
                  class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab() === "basic"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  solid-effect-query
                  <span class="ml-2 text-xs text-gray-400">(Basic Effect integration)</span>
                </button>
                <button
                  onClick={() => setActiveTab("httpapi")}
                  class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab() === "httpapi"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  solid-effect-query-http-api
                  <span class="ml-2 text-xs text-gray-400">(Effect Platform HTTP API)</span>
                </button>
                <button
                  onClick={() => setActiveTab("rpc")}
                  class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab() === "rpc"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  solid-effect-query-rpc
                  <span class="ml-2 text-xs text-gray-400">(Effect RPC integration)</span>
                </button>
              </nav>
            </div>
          </div>
          
          <div class="mb-8">
            <Show when={activeTab() === "basic"}>
              <div class="space-y-6">
                <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <p class="text-sm text-blue-700">
                    <strong>solid-effect-query</strong> provides the core integration between Effect and TanStack Query.
                    It offers <code class="bg-blue-100 px-1 rounded">makeEffectRuntime</code> for managing Effect services
                    and hooks like <code class="bg-blue-100 px-1 rounded">useEffectQuery</code> and 
                    <code class="bg-blue-100 px-1 rounded">useEffectMutation</code>.
                  </p>
                </div>
                {/* Main demos */}
                <TestRuntime />
                
                {/* Test components in 2-column grid */}
                <div class="mt-6">
                  <h3 class="text-lg font-semibold mb-4">Test Components</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border rounded-lg p-4">
                      <TestMinimal />
                    </div>
                    <div class="border rounded-lg p-4">
                      <TestRuntimeDebug />
                    </div>
                    <div class="border rounded-lg p-4">
                      <TestLocalsError />
                    </div>
                    <div class="border rounded-lg p-4">
                      <TestInfiniteLoop />
                    </div>
                  </div>
                </div>
                
                {/* Main demos continued */}
                <div class="mt-6 space-y-6">
                  <NoRuntimeQuery />
                  <BasicEffectQuery />
                  <SimpleEffectQueryDemo />
                  <PlatformBrowserHttpDemo />
                </div>
              </div>
            </Show>
            
            <Show when={activeTab() === "httpapi"}>
              <div class="space-y-6">
                <div class="bg-green-50 border-l-4 border-green-400 p-4">
                  <p class="text-sm text-green-700">
                    <strong>solid-effect-query-http-api</strong> extends the base package with specialized hooks for
                    Effect Platform's HTTP API. It provides <code class="bg-green-100 px-1 rounded">makeHttpApiQuery</code>
                    and <code class="bg-green-100 px-1 rounded">makeHttpApiMutation</code> for type-safe API interactions.
                  </p>
                </div>
                <TodosHttpApi />
              </div>
            </Show>
            
            <Show when={activeTab() === "rpc"}>
              <div class="space-y-6">
                <div class="bg-purple-50 border-l-4 border-purple-400 p-4">
                  <p class="text-sm text-purple-700">
                    <strong>solid-effect-query-rpc</strong> integrates Effect RPC with TanStack Query, providing
                    type-safe RPC client hooks. It handles serialization, error handling, and provides full
                    type inference from your RPC definitions.
                  </p>
                </div>
                <RpcDemo />
              </div>
            </Show>
          </div>
          
          <div class="bg-white rounded-lg shadow p-6 mt-12">
            <h2 class="text-lg font-semibold mb-3">Architecture Overview</h2>
            <div class="space-y-3 text-sm text-gray-600">
              <div>
                <h3 class="font-medium text-gray-800 mb-1">Backend Server (port 3001)</h3>
                <ul class="list-disc list-inside space-y-1 ml-4">
                  <li>HTTP API endpoints at <code class="bg-gray-100 px-1 rounded">/api/*</code></li>
                  <li>RPC endpoint at <code class="bg-gray-100 px-1 rounded">/rpc/tasks</code></li>
                  <li>API documentation at <code class="bg-gray-100 px-1 rounded">/api/docs</code></li>
                  <li>Health check at <code class="bg-gray-100 px-1 rounded">/health</code></li>
                </ul>
              </div>
              <div>
                <h3 class="font-medium text-gray-800 mb-1">Frontend Integration</h3>
                <ul class="list-disc list-inside space-y-1 ml-4">
                  <li>All three packages share the same TanStack Query client</li>
                  <li>Effect services are managed through layers and runtime providers</li>
                  <li>Type safety is maintained from server definitions to client hooks</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SolidQueryDevtools />
      <DebugConsole />
    </QueryClientProvider>
  )
}