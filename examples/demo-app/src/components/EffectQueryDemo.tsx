import { Show, createSignal, For } from "solid-js";
import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Schema, Logger, Layer } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";

// Create the Effect runtime with just the logger - no HTTP client
const { Provider, useEffectQuery, useEffectMutation } = makeEffectRuntime(() =>
  Layer.merge(Logger.pretty, FetchHttpClient.layer),
);

// Schema definitions for external APIs
const GitHubUserSchema = Schema.Struct({
  login: Schema.String,
  name: Schema.NullOr(Schema.String),
  bio: Schema.NullOr(Schema.String),
  company: Schema.NullOr(Schema.String),
  location: Schema.NullOr(Schema.String),
  email: Schema.NullOr(Schema.String),
  followers: Schema.Number,
  following: Schema.Number,
  public_repos: Schema.Number,
  created_at: Schema.String,
}).annotations({
  identifier: "GitHubUser",
  description: "GitHub user profile information",
});

const JsonPlaceholderUserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  username: Schema.String,
  email: Schema.String,
  phone: Schema.String,
  website: Schema.String,
  company: Schema.Struct({
    name: Schema.String,
    catchPhrase: Schema.String,
    bs: Schema.String,
  }),
}).annotations({
  identifier: "JsonPlaceholderUser",
  description: "User data from JSONPlaceholder API",
});

const JsonPlaceholderUsersSchema = Schema.Array(JsonPlaceholderUserSchema);

// Type inference from schemas
type JsonPlaceholderUser = Schema.Schema.Type<typeof JsonPlaceholderUserSchema>;

// Component that uses the Effect query
function EffectQueryContent() {
  console.log("[EffectQueryDemo] EffectQueryContent component mounting");

  const [selectedDemo, setSelectedDemo] = createSignal<
    "github" | "jsonplaceholder"
  >("jsonplaceholder");
  const [userId, setUserId] = createSignal(1);

  // JSONPlaceholder users query
  const usersQuery = useEffectQuery(() => {
    console.log("[EffectQueryDemo] Creating users query for:", selectedDemo());
    return {
      queryKey: ["users", selectedDemo()],
      queryFn: () =>
        Effect.gen(function* () {
          yield* Effect.log(`Starting query for ${selectedDemo()}`);
          console.log(
            "[EffectQueryDemo] Query function executing for:",
            selectedDemo(),
          );

          const client = yield* HttpClient.HttpClient;
          yield* Effect.log("HTTP client obtained");

          if (selectedDemo() === "github") {
            // Fetch GitHub users
            yield* Effect.log("Fetching GitHub user octocat");
            console.log("[EffectQueryDemo] Making GitHub API request");
            const response = yield* client
              .get("https://api.github.com/users/octocat")
              .pipe(
                Effect.tap((res) =>
                  Effect.log(`GitHub response status: ${res.status}`),
                ),
              );

            // Check if response is ok
            if (response.status !== 200) {
              return yield* Effect.fail(new Error(`HTTP ${response.status}`));
            }

            yield* Effect.log("Decoding GitHub user response");
            const user =
              yield* HttpClientResponse.schemaBodyJson(GitHubUserSchema)(
                response,
              );
            yield* Effect.log("GitHub user decoded successfully", user);
            console.log("[EffectQueryDemo] GitHub user data:", user);
            return { type: "github" as const, data: user };
          } else {
            // Fetch JSONPlaceholder users
            yield* Effect.log("Fetching JSONPlaceholder users");
            console.log("[EffectQueryDemo] Making JSONPlaceholder API request");
            const response = yield* client
              .get("https://jsonplaceholder.typicode.com/users")
              .pipe(
                Effect.tap((res) =>
                  Effect.log(`JSONPlaceholder response status: ${res.status}`),
                ),
              );

            if (response.status !== 200) {
              return yield* Effect.fail(new Error(`HTTP ${response.status}`));
            }

            yield* Effect.log("Decoding JSONPlaceholder users response");
            const users = yield* HttpClientResponse.schemaBodyJson(
              JsonPlaceholderUsersSchema,
            )(response);
            yield* Effect.log(
              `JSONPlaceholder users decoded successfully, count: ${users.length}`,
            );
            console.log(
              "[EffectQueryDemo] JSONPlaceholder users count:",
              users.length,
            );
            return { type: "jsonplaceholder" as const, data: users };
          }
        }).pipe(
          Effect.tapError((error) =>
            Effect.sync(() => {
              console.error("[EffectQueryDemo] Query error:", error);
            }).pipe(Effect.zipRight(Effect.log("Query error:", error))),
          ),
          Effect.withLogSpan("usersQuery"),
        ),
      staleTime: 30000,
    };
  });

  // Single user query for JSONPlaceholder
  const userQuery = useEffectQuery(() => {
    console.log("[EffectQueryDemo] Creating user query for ID:", userId());
    return {
      queryKey: ["user", userId()],
      queryFn: () =>
        Effect.gen(function* () {
          yield* Effect.log(`Starting single user query for ID: ${userId()}`);
          console.log(
            "[EffectQueryDemo] User query function executing for ID:",
            userId(),
          );

          const client = yield* HttpClient.HttpClient;
          const url = `https://jsonplaceholder.typicode.com/users/${userId()}`;
          yield* Effect.log(`Fetching user from: ${url}`);

          const response = yield* client
            .get(url)
            .pipe(
              Effect.tap((res) =>
                Effect.log(`User response status: ${res.status}`),
              ),
            );

          if (response.status !== 200) {
            return yield* Effect.fail(new Error(`HTTP ${response.status}`));
          }

          yield* Effect.log("Decoding user response");
          const user = yield* HttpClientResponse.schemaBodyJson(
            JsonPlaceholderUserSchema,
          )(response);
          yield* Effect.log("User decoded successfully", user);
          console.log("[EffectQueryDemo] User data:", user);
          return user;
        }).pipe(
          Effect.tapError((error) =>
            Effect.sync(() => {
              console.error("[EffectQueryDemo] User query error:", error);
            }).pipe(Effect.zipRight(Effect.log("User query error:", error))),
          ),
          Effect.withLogSpan("userQuery"),
        ),
      enabled: selectedDemo() === "jsonplaceholder",
      staleTime: 30000,
    };
  });

  // Update user mutation
  const updateUserMutation = useEffectMutation(() => ({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      Effect.gen(function* () {
        yield* Effect.log(
          `Starting user update mutation for ID: ${id}, name: ${name}`,
        );
        console.log("[EffectQueryDemo] Updating user:", { id, name });

        const client = yield* HttpClient.HttpClient;

        // Create request with JSON body
        const request = HttpClientRequest.patch(
          `https://jsonplaceholder.typicode.com/users/${id}`,
        );

        // Add JSON body
        const requestWithBody = yield* HttpClientRequest.bodyJson(request, {
          name,
        });

        // Execute request
        yield* Effect.log("Executing PATCH request");
        const response = yield* client.execute(requestWithBody);

        yield* Effect.log(`Mutation response status: ${response.status}`);
        if (response.status !== 200) {
          return yield* Effect.fail(new Error(`HTTP ${response.status}`));
        }

        const updatedUser = yield* HttpClientResponse.schemaBodyJson(
          JsonPlaceholderUserSchema,
        )(response);
        yield* Effect.log("User updated successfully", updatedUser);
        console.log("[EffectQueryDemo] Updated user data:", updatedUser);
        return updatedUser;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            console.error("[EffectQueryDemo] Mutation error:", error);
          }).pipe(Effect.zipRight(Effect.log("Mutation error:", error))),
        ),
        Effect.withLogSpan("updateUserMutation"),
      ),
    onSuccess: () =>
      Effect.sync(() => {
        // Show success message or refetch
        console.log("[EffectQueryDemo] Mutation onSuccess callback");
        if (selectedDemo() === "jsonplaceholder") {
          userQuery.refetch();
        }
      }),
  }));

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">
        Effect Query with External APIs
      </h2>
      <p class="text-gray-600 text-sm mb-4">
        This demonstrates the core{" "}
        <code class="bg-gray-100 px-1 rounded">solid-effect-query</code> package
        fetching real data from external APIs with proper error handling.
      </p>
      <div class="bg-blue-50 border-l-4 border-blue-400 p-3 mb-6">
        <p class="text-sm text-blue-700">
          <strong>📊 Debug Console:</strong> Check the floating console at the
          bottom-right corner to see Effect logs and debug output. Open your
          browser's DevTools console for more detailed logs.
        </p>
      </div>

      {/* Demo selector */}
      <div class="mb-6">
        <label class="block text-sm font-medium mb-2">Select API:</label>
        <div class="flex gap-2">
          <button
            onClick={() => setSelectedDemo("jsonplaceholder")}
            class={`px-4 py-2 rounded transition-colors ${
              selectedDemo() === "jsonplaceholder"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            JSONPlaceholder API
          </button>
          <button
            onClick={() => setSelectedDemo("github")}
            class={`px-4 py-2 rounded transition-colors ${
              selectedDemo() === "github"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            GitHub API
          </button>
        </div>
      </div>

      {/* User ID selector for JSONPlaceholder */}
      <Show when={selectedDemo() === "jsonplaceholder"}>
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
      </Show>

      {/* Query Results */}
      <div class="space-y-4">
        {/* Loading state */}
        <Show when={usersQuery.isPending || userQuery.isPending}>
          <div class="animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </Show>

        {/* Error state */}
        <Show when={usersQuery.isError || userQuery.isError}>
          <div class="text-red-500 bg-red-50 p-3 rounded">
            <p class="font-medium">Error fetching data:</p>
            <p class="text-sm">
              {usersQuery.error?.toString() || userQuery.error?.toString()}
            </p>
          </div>
        </Show>

        {/* Success state - GitHub */}
        <Show
          when={
            selectedDemo() === "github" &&
            usersQuery.isSuccess &&
            usersQuery.data?.type === "github" &&
            usersQuery.data.data
          }
        >
          {(data) => (
            <div class="bg-gray-50 p-4 rounded space-y-2">
              <h3 class="font-semibold text-lg">
                {data().name || data().login}
              </h3>
              <div class="text-sm space-y-1">
                <p>
                  <span class="font-medium">Username:</span> @{data().login}
                </p>
                <p>
                  <span class="font-medium">Bio:</span> {data().bio || "No bio"}
                </p>
                <p>
                  <span class="font-medium">Company:</span>{" "}
                  {data().company || "Not specified"}
                </p>
                <p>
                  <span class="font-medium">Location:</span>{" "}
                  {data().location || "Not specified"}
                </p>
                <p>
                  <span class="font-medium">Followers:</span> {data().followers}
                </p>
                <p>
                  <span class="font-medium">Following:</span> {data().following}
                </p>
                <p>
                  <span class="font-medium">Public Repos:</span>{" "}
                  {data().public_repos}
                </p>
              </div>
            </div>
          )}
        </Show>

        {/* Success state - JSONPlaceholder List */}
        <Show
          when={
            selectedDemo() === "jsonplaceholder" &&
            usersQuery.isSuccess &&
            usersQuery.data?.type === "jsonplaceholder"
          }
        >
          <div>
            <h3 class="font-medium mb-3">All Users:</h3>
            <div class="grid gap-2">
              <For each={(usersQuery.data as any).data.slice(0, 5)}>
                {(user: JsonPlaceholderUser) => (
                  <button
                    onClick={() => setUserId(user.id)}
                    class={`text-left p-3 rounded border transition-colors ${
                      userId() === user.id
                        ? "bg-blue-50 border-blue-300"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <p class="font-medium">{user.name}</p>
                    <p class="text-sm text-gray-600">{user.email}</p>
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Success state - JSONPlaceholder Single User */}
        <Show
          when={
            selectedDemo() === "jsonplaceholder" &&
            userQuery.isSuccess &&
            userQuery.data
          }
        >
          {(() => {
            const userData = userQuery.data;
            if (!userData) return null;

            return (
              <div class="bg-green-50 p-4 rounded space-y-2 mt-4">
                <h3 class="font-semibold text-lg">{userData.name}</h3>
                <div class="text-sm space-y-1">
                  <p>
                    <span class="font-medium">Username:</span>{" "}
                    {userData.username}
                  </p>
                  <p>
                    <span class="font-medium">Email:</span> {userData.email}
                  </p>
                  <p>
                    <span class="font-medium">Phone:</span> {userData.phone}
                  </p>
                  <p>
                    <span class="font-medium">Website:</span> {userData.website}
                  </p>
                  <p>
                    <span class="font-medium">Company:</span>{" "}
                    {userData.company.name}
                  </p>
                </div>

                {/* Update form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get("name") as string;
                    if (name) {
                      updateUserMutation.mutate({ id: userId(), name });
                    }
                  }}
                  class="mt-4 pt-4 border-t"
                >
                  <label class="block text-sm font-medium mb-2">
                    Update Name:
                  </label>
                  <div class="flex gap-2">
                    <input
                      name="name"
                      type="text"
                      placeholder={userData.name}
                      class="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={updateUserMutation.isPending}
                    />
                    <button
                      type="submit"
                      disabled={updateUserMutation.isPending}
                      class="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      {updateUserMutation.isPending ? "Updating..." : "Update"}
                    </button>
                  </div>
                </form>

                <Show when={updateUserMutation.isSuccess}>
                  <p class="text-green-600 text-sm mt-2">
                    Updated successfully! (Note: JSONPlaceholder doesn't
                    actually save changes)
                  </p>
                </Show>

                <Show when={updateUserMutation.isError}>
                  <p class="text-red-600 text-sm mt-2">
                    Update failed: {updateUserMutation.error?.toString()}
                  </p>
                </Show>
              </div>
            );
          })()}
        </Show>

        {/* Refetch buttons */}
        <div class="flex gap-2 mt-4">
          <button
            onClick={() => usersQuery.refetch()}
            disabled={usersQuery.isFetching}
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {usersQuery.isFetching ? "Refetching..." : "Refetch List"}
          </button>
          <Show when={selectedDemo() === "jsonplaceholder"}>
            <button
              onClick={() => userQuery.refetch()}
              disabled={userQuery.isFetching || !userQuery.isEnabled}
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {userQuery.isFetching ? "Refetching..." : "Refetch User"}
            </button>
          </Show>
        </div>
      </div>

      {/* Features showcase */}
      <div class="mt-8 pt-6 border-t">
        <h3 class="font-medium mb-3">Features Demonstrated:</h3>
        <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>
            External API calls with Effect's browser HTTP client
            (XMLHttpRequest)
          </li>
          <li>Type-safe API responses using Effect Schema for validation</li>
          <li>
            Schema-based JSON decoding with{" "}
            <code class="bg-gray-100 px-1 rounded">
              HttpClientResponse.schemaBodyJson
            </code>
          </li>
          <li>
            Effect logging with{" "}
            <code class="bg-gray-100 px-1 rounded">Effect.log</code> and{" "}
            <code class="bg-gray-100 px-1 rounded">Effect.withLogSpan</code>
          </li>
          <li>Proper error handling and HTTP status checking</li>
          <li>Conditional queries based on user selection</li>
          <li>
            Mutations with JSON body using{" "}
            <code class="bg-gray-100 px-1 rounded">
              HttpClientRequest.bodyJson
            </code>
          </li>
          <li>Loading, error, and success states</li>
          <li>Query invalidation and refetching</li>
        </ul>
      </div>
    </div>
  );
}

// Export wrapped with Provider
export function EffectQueryDemo() {
  console.log("[EffectQueryDemo] Main component rendering");
  console.log("[EffectQueryDemo] Provider:", Provider);
  console.log("[EffectQueryDemo] Logger.pretty:", Logger.pretty);

  return (
    <Provider>
      <EffectQueryContent />
    </Provider>
  );
}
