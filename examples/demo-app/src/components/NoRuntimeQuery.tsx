import { Show, createSignal } from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import { Effect } from "effect";

// Don't use makeEffectRuntime at all - just use TanStack Query directly with Effect
function NoRuntimeQuery() {
  console.log("[NoRuntimeQuery] Component mounting");
  
  const [userId, setUserId] = createSignal(1);

  // Use regular TanStack Query with Effect
  const userQuery = createQuery(() => ({
    queryKey: ["no-runtime-user", userId()],
    queryFn: async () => {
      console.log("[NoRuntimeQuery] Query function executing for user:", userId());
      
      // Run Effect directly without any runtime
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          console.log("[NoRuntimeQuery] Inside Effect generator");
          
          const response = yield* Effect.tryPromise({
            try: () => fetch(`https://jsonplaceholder.typicode.com/users/${userId()}`),
            catch: (error) => new Error(`Fetch failed: ${error}`)
          });
          
          console.log("[NoRuntimeQuery] Response status:", response.status);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = yield* Effect.tryPromise({
            try: () => response.json(),
            catch: () => new Error("Failed to parse JSON")
          });
          
          console.log("[NoRuntimeQuery] Data received:", data);
          return data;
        })
      );
      
      return result;
    },
    staleTime: 30000,
  }));

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">No Runtime Query (Direct Effect)</h2>
      <p class="text-gray-600 text-sm mb-4">
        This bypasses solid-effect-query entirely and uses TanStack Query directly with Effect.
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
                  ? "bg-blue-500 text-white"
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
          <div class="bg-blue-50 p-4 rounded">
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

export { NoRuntimeQuery };