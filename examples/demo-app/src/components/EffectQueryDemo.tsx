import { For, Show } from "solid-js";
import {
  makeEffectRuntime,
  Effect,
  Layer,
} from "../../../../packages/solid-effect-query/src";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

// Create a layer with the HTTP client
const HttpClientLive = FetchHttpClient.layer;

// Create the Effect runtime with HTTP client
const { Provider, useEffectQuery } = makeEffectRuntime(() => HttpClientLive);

// Component that uses the Effect query
function UserListContent() {
  const query = useEffectQuery(() => ({
    queryKey: ["users"],
    queryFn: () =>
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient;
        const request = HttpClientRequest.get("/api/users");
        const response = yield* client.execute(request);
        const body = yield* response.json;
        return body as User[];
      }),
  }));

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Users (Effect Query)</h2>
      <Show when={query.isLoading}>
        <p>Loading users...</p>
      </Show>
      <Show when={query.isError}>
        <div class="text-red-500 bg-red-50 p-3 rounded">
          Error: {query.error?.toString() || "Failed to load users"}
        </div>
      </Show>
      <Show when={query.isSuccess}>
        <ul class="space-y-2">
          <For each={query.data}>
            {(user) => (
              <li class="p-3 bg-gray-50 rounded">
                <div class="font-semibold">{user.name}</div>
                <div class="text-sm text-gray-600">{user.email}</div>
                <div class="text-xs text-gray-400">
                  Created: {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

// Export the component wrapped with the Provider
export function EffectQueryDemo() {
  return (
    <Provider>
      <UserListContent />
    </Provider>
  );
}
