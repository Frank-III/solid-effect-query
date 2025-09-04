import { Show, createSignal, For } from "solid-js";
import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Schema, Layer } from "effect";

// Create the Effect runtime with an empty layer for now
// Logger.pretty requires FiberRefs which need a more complex setup
const { Provider, useEffectQuery } = makeEffectRuntime(() => Layer.empty);

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
  description: "GitHub user profile information"
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
  description: "User data from JSONPlaceholder API"
});

const JsonPlaceholderUsersSchema = Schema.Array(JsonPlaceholderUserSchema);

// Type inference from schemas
type JsonPlaceholderUser = Schema.Schema.Type<typeof JsonPlaceholderUserSchema>;

// Helper function to fetch with Effect
const fetchJson = (url: string) => 
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) => new Error(`Fetch failed: ${error}`)
    });
    
    if (!response.ok) {
      return yield* Effect.fail(new Error(`HTTP ${response.status}`));
    }
    
    return yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => new Error("Failed to parse JSON")
    });
  });

// Component that uses the Effect query
function SimpleEffectQueryContent() {
  const [selectedDemo, setSelectedDemo] = createSignal<"github" | "jsonplaceholder">("jsonplaceholder");
  const [userId, setUserId] = createSignal(1);

  // JSONPlaceholder users query
  const usersQuery = useEffectQuery(() => {
    return {
      queryKey: ["users", selectedDemo()],
      queryFn: () =>
        Effect.gen(function* () {
          if (selectedDemo() === "github") {
            const data = yield* fetchJson("https://api.github.com/users/octocat");
            const user = yield* Schema.decode(GitHubUserSchema)(data);
            return { type: "github" as const, data: user };
          } else {
            const data = yield* fetchJson("https://jsonplaceholder.typicode.com/users");
            const users = yield* Schema.decode(JsonPlaceholderUsersSchema)(data);
            return { type: "jsonplaceholder" as const, data: users };
          }
        }),
      staleTime: 30000,
    };
  });

  // Single user query for JSONPlaceholder
  const userQuery = useEffectQuery(() => {
    return {
      queryKey: ["user", userId()],
      queryFn: () =>
        Effect.gen(function* () {
          const data = yield* fetchJson(`https://jsonplaceholder.typicode.com/users/${userId()}`);
          const user = yield* Schema.decode(JsonPlaceholderUserSchema)(data);
          return user;
        }),
      enabled: selectedDemo() === "jsonplaceholder",
      staleTime: 30000,
    };
  });

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Simple Effect Query (No Platform HTTP)</h2>
      <p class="text-gray-600 text-sm mb-4">
        This version uses native fetch wrapped in Effect, avoiding platform-specific HTTP client issues.
      </p>
      
      <div class="bg-green-50 border-l-4 border-green-400 p-3 mb-6">
        <p class="text-sm text-green-700">
          <strong>✅ Working Demo:</strong> This implementation bypasses the "locals" error by using native fetch directly.
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
            <p class="text-sm">{usersQuery.error?.toString() || userQuery.error?.toString()}</p>
          </div>
        </Show>

        {/* Success state - GitHub */}
        <Show when={selectedDemo() === "github" && usersQuery.isSuccess && usersQuery.data?.type === "github"}>
          <div class="bg-gray-50 p-4 rounded space-y-2">
            <h3 class="font-semibold text-lg">{(usersQuery.data as any).data.name || (usersQuery.data as any).data.login}</h3>
            <div class="text-sm space-y-1">
              <p><span class="font-medium">Username:</span> @{(usersQuery.data as any).data.login}</p>
              <p><span class="font-medium">Bio:</span> {(usersQuery.data as any).data.bio || "No bio"}</p>
              <p><span class="font-medium">Company:</span> {(usersQuery.data as any).data.company || "Not specified"}</p>
              <p><span class="font-medium">Location:</span> {(usersQuery.data as any).data.location || "Not specified"}</p>
              <p><span class="font-medium">Followers:</span> {(usersQuery.data as any).data.followers}</p>
              <p><span class="font-medium">Following:</span> {(usersQuery.data as any).data.following}</p>
              <p><span class="font-medium">Public Repos:</span> {(usersQuery.data as any).data.public_repos}</p>
            </div>
          </div>
        </Show>

        {/* Success state - JSONPlaceholder List */}
        <Show when={selectedDemo() === "jsonplaceholder" && usersQuery.isSuccess && usersQuery.data?.type === "jsonplaceholder"}>
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
        <Show when={selectedDemo() === "jsonplaceholder" && userQuery.isSuccess && userQuery.data}>
          <div class="bg-green-50 p-4 rounded space-y-2 mt-4">
            <h3 class="font-semibold text-lg">{userQuery.data!.name}</h3>
            <div class="text-sm space-y-1">
              <p><span class="font-medium">Username:</span> {userQuery.data!.username}</p>
              <p><span class="font-medium">Email:</span> {userQuery.data!.email}</p>
              <p><span class="font-medium">Phone:</span> {userQuery.data!.phone}</p>
              <p><span class="font-medium">Website:</span> {userQuery.data!.website}</p>
              <p><span class="font-medium">Company:</span> {userQuery.data!.company.name}</p>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

// Export wrapped with Provider
export function SimpleEffectQueryDemo() {
  return (
    <Provider>
      <SimpleEffectQueryContent />
    </Provider>
  );
}