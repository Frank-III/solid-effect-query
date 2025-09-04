import { Show, createSignal } from "solid-js";
import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Layer } from "effect";

// Create the most minimal runtime possible - empty layer
const { Provider, useEffectQuery } = makeEffectRuntime(() => Layer.empty);

// Helper function to fetch with Effect
const fetchJson = (url: string) => 
  Effect.gen(function* () {
    console.log(`[BasicEffectQuery] Fetching: ${url}`);
    
    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) => new Error(`Fetch failed: ${error}`)
    });
    
    console.log(`[BasicEffectQuery] Response status: ${response.status}`);
    
    if (!response.ok) {
      return yield* Effect.fail(new Error(`HTTP ${response.status}`));
    }
    
    return yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => new Error("Failed to parse JSON")
    });
  });

// Component that uses the Effect query
function BasicEffectQueryContent() {
  console.log("[BasicEffectQueryContent] Component mounting");
  
  const [userId, setUserId] = createSignal(1);

  // Simple user query
  const userQuery = useEffectQuery(() => {
    return {
      queryKey: ["user", userId()],
      queryFn: () =>
        Effect.gen(function* () {
          console.log(`[BasicEffectQueryContent] Query function executing for user ${userId()}`);
          
          const data = yield* fetchJson(`https://jsonplaceholder.typicode.com/users/${userId()}`);
          console.log("[BasicEffectQueryContent] User data received:", data);
          return data;
        }).pipe(
          Effect.tapError((error) => 
            Effect.sync(() => {
              console.error("[BasicEffectQueryContent] Query error:", error);
            })
          )
        ),
      staleTime: 30000,
    };
  });

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Basic Effect Query (Minimal Runtime)</h2>
      <p class="text-gray-600 text-sm mb-4">
        This is the most minimal version possible - no logger, no HTTP client, just Effect + fetch.
      </p>

      {/* User ID selector */}
      <div class="mb-6">
        <label class="block text-sm font-medium mb-2">Select User ID:</label>
        <div class="flex gap-2">
          {[1, 2, 3, 4, 5].map((id) => (
            <button
              onClick={() => setUserId(id)}
              class={`px-3 py-1 rounded transition-colors ${
                userId() === id
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      {/* Query Results */}
      <div class="space-y-4">
        <Show when={userQuery.isPending}>
          <div class="animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </Show>

        <Show when={userQuery.isError}>
          <div class="text-red-500 bg-red-50 p-3 rounded">
            <p class="font-medium">Error:</p>
            <p class="text-sm">{userQuery.error?.toString()}</p>
          </div>
        </Show>

        <Show when={userQuery.isSuccess && userQuery.data}>
          <div class="bg-green-50 p-4 rounded">
            <h3 class="font-semibold">{userQuery.data.name}</h3>
            <p class="text-sm text-gray-600">Email: {userQuery.data.email}</p>
            <p class="text-sm text-gray-600">Phone: {userQuery.data.phone}</p>
            <p class="text-sm text-gray-600">Website: {userQuery.data.website}</p>
            <p class="text-sm text-gray-600">Company: {userQuery.data.company.name}</p>
          </div>
        </Show>
      </div>
    </div>
  );
}

// Export wrapped with Provider
export function BasicEffectQuery() {
  console.log("[BasicEffectQuery] Main component rendering");
  
  return (
    <Provider>
      <BasicEffectQueryContent />
    </Provider>
  );
}