import { For, Show } from "solid-js"
import { createQuery } from "@tanstack/solid-query"
import { Effect } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "@effect/platform"

interface User {
  id: number
  name: string
  email: string
  createdAt: string
}

// Create a layer with the HTTP client
const HttpClientLive = FetchHttpClient.layer

// Create an effect that fetches users
const fetchUsers = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const request = HttpClientRequest.get("/api/users")
  const response = yield* client.execute(request)
  const body = yield* response.json
  return body as User[]
}).pipe(
  Effect.provide(HttpClientLive),
  Effect.runPromise
)

export function SimpleUserList() {
  const query = createQuery(() => ({
    queryKey: ["users"],
    queryFn: async () => {
      const users = await fetchUsers
      return users
    }
  }))

  return (
    <div class="user-list">
      <h2>Users (Simple)</h2>
      <Show when={query.isLoading}>
        <p>Loading users...</p>
      </Show>
      <Show when={query.isError}>
        <p class="error">Error: {query.error?.message || "Failed to load users"}</p>
      </Show>
      <Show when={query.isSuccess}>
        <ul>
          <For each={query.data}>
            {(user) => (
              <li>
                <strong>{user.name}</strong> - {user.email}
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}