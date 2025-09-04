import { createSignal, Show, For } from "solid-js";
import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Schema, pipe } from "effect";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as HttpBody from "@effect/platform/HttpBody";

// Schema definitions
const TodoSchema = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
});

const PostSchema = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  body: Schema.String,
});

type Todo = Schema.Schema.Type<typeof TodoSchema>;
type Post = Schema.Schema.Type<typeof PostSchema>;

// Create runtime with FetchHttpClient layer
const { Provider, useEffectQuery, useEffectMutation } = makeEffectRuntime(() => 
  FetchHttpClient.layer
);

// Helper to make HTTP GET requests with Effect
function getJson<A>(url: string, schema: Schema.Schema<A>) {
  return pipe(
    HttpClient.get(url),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
    Effect.scoped
  );
}

// Helper to make HTTP PATCH requests with Effect
function patchJson<A>(url: string, body: unknown, schema: Schema.Schema<A>) {
  return pipe(
    HttpClientRequest.patch(url),
    HttpClientRequest.setBody(HttpBody.text(JSON.stringify(body))),
    HttpClientRequest.setHeader("Content-Type", "application/json"),
    HttpClient.execute,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
    Effect.scoped
  );
}

// Helper to make HTTP POST requests with Effect
function postJson<A>(url: string, body: unknown, schema: Schema.Schema<A>) {
  return pipe(
    HttpClientRequest.post(url),
    HttpClientRequest.setBody(HttpBody.text(JSON.stringify(body))),
    HttpClientRequest.setHeader("Content-Type", "application/json"),
    HttpClient.execute,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
    Effect.scoped
  );
}

function PlatformBrowserDemoContent() {
  const [selectedUserId, setSelectedUserId] = createSignal(1);
  const [showPosts, setShowPosts] = createSignal(false);

  // Fetch todos for a user
  const todosQuery = useEffectQuery(() => ({
    queryKey: ["todos", selectedUserId()],
    queryFn: () =>
      pipe(
        getJson(
          `https://jsonplaceholder.typicode.com/todos?userId=${selectedUserId()}&_limit=5`,
          Schema.Array(TodoSchema)
        ),
        Effect.tap((todos) => 
          Effect.log(`Fetched ${todos.length} todos for user ${selectedUserId()}`)
        ),
        Effect.tapError((error) =>
          Effect.log(`Failed to fetch todos: ${error}`)
        )
      ),
    staleTime: 30000,
  }));

  // Fetch posts for a user
  const postsQuery = useEffectQuery(() => ({
    queryKey: ["posts", selectedUserId()],
    queryFn: () =>
      pipe(
        getJson(
          `https://jsonplaceholder.typicode.com/posts?userId=${selectedUserId()}&_limit=3`,
          Schema.Array(PostSchema)
        ),
        Effect.tap((posts) => 
          Effect.log(`Fetched ${posts.length} posts for user ${selectedUserId()}`)
        )
      ),
    enabled: showPosts(),
    staleTime: 30000,
  }));

  // Update a todo's completion status
  // Note: JSONPlaceholder is a fake API - updates don't persist server-side
  // In a real app, you might want to either:
  // 1. Update the cache optimistically (best UX)
  // 2. Refetch to ensure sync (current behavior, but removed here since it resets the UI)
  const updateTodoMutation = useEffectMutation(() => ({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      pipe(
        patchJson(
          `https://jsonplaceholder.typicode.com/todos/${id}`,
          { completed },
          TodoSchema
        ),
        Effect.tap((todo) => 
          Effect.log(`Updated todo ${id}: completed=${todo.completed}`)
        )
      )
  }));

  // Create a new post
  const createPostMutation = useEffectMutation(() => ({
    mutationFn: ({ title, body }: { title: string; body: string }) =>
      pipe(
        postJson(
          "https://jsonplaceholder.typicode.com/posts",
          {
            title,
            body,
            userId: selectedUserId(),
          },
          PostSchema
        ),
        Effect.tap((post) => 
          Effect.log(`Created new post with id: ${post.id}`)
        )
      ),
  }));

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Platform Browser HTTP Client Demo</h2>
      <p class="text-gray-600 text-sm mb-4">
        Using @effect/platform HttpClient with fetch for HTTP requests.
      </p>

      <div class="bg-blue-50 border-l-4 border-blue-400 p-3 mb-6">
        <p class="text-sm text-blue-700">
          <strong>✨ Features:</strong> Type-safe HTTP requests, automatic JSON parsing, schema validation, and proper error handling.
        </p>
      </div>

      {/* User selector */}
      <div class="mb-6">
        <label class="block text-sm font-medium mb-2">Select User:</label>
        <div class="flex gap-2">
          <For each={[1, 2, 3, 4, 5]}>
            {(userId) => (
              <button
                onClick={() => setSelectedUserId(userId)}
                class={`px-3 py-1 rounded transition-colors ${
                  selectedUserId() === userId
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                User {userId}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Todos Section */}
      <div class="mb-6">
        <h3 class="font-medium mb-3">Todos:</h3>
        <Show
          when={!todosQuery.isPending}
          fallback={
            <div class="animate-pulse space-y-2">
              <div class="h-10 bg-gray-200 rounded"></div>
              <div class="h-10 bg-gray-200 rounded"></div>
            </div>
          }
        >
          <Show
            when={todosQuery.isSuccess && todosQuery.data}
            fallback={
              <div class="text-red-500">
                Error: {todosQuery.error?.toString()}
              </div>
            }
          >
            <div class="space-y-2">
              <For each={todosQuery.data}>
                {(todo: Todo) => (
                  <div class="flex items-center gap-3 p-2 border rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={(e) => {
                        updateTodoMutation.mutate({
                          id: todo.id,
                          completed: e.currentTarget.checked,
                        });
                      }}
                      disabled={updateTodoMutation.isPending}
                      class="h-4 w-4"
                    />
                    <span
                      class={`flex-1 ${
                        todo.completed ? "line-through text-gray-500" : ""
                      }`}
                    >
                      {todo.title}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>

      {/* Posts Section */}
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-medium">Posts:</h3>
          <button
            onClick={() => setShowPosts(!showPosts())}
            class="text-sm text-blue-500 hover:text-blue-600"
          >
            {showPosts() ? "Hide" : "Show"} Posts
          </button>
        </div>
        
        <Show when={showPosts()}>
          <Show
            when={!postsQuery.isPending}
            fallback={
              <div class="animate-pulse space-y-2">
                <div class="h-20 bg-gray-200 rounded"></div>
                <div class="h-20 bg-gray-200 rounded"></div>
              </div>
            }
          >
            <Show
              when={postsQuery.isSuccess && postsQuery.data}
              fallback={
                <div class="text-red-500">
                  Error: {postsQuery.error?.toString()}
                </div>
              }
            >
              <div class="space-y-3">
                <For each={postsQuery.data}>
                  {(post: Post) => (
                    <div class="p-3 border rounded">
                      <h4 class="font-medium text-sm mb-1">{post.title}</h4>
                      <p class="text-sm text-gray-600">{post.body}</p>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Show>
      </div>

      {/* Create Post Form */}
      <div class="border-t pt-4">
        <h3 class="font-medium mb-3">Create New Post:</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const title = formData.get("title") as string;
            const body = formData.get("body") as string;
            
            if (title && body) {
              createPostMutation.mutate({ title, body });
              e.currentTarget.reset();
            }
          }}
          class="space-y-3"
        >
          <input
            name="title"
            type="text"
            placeholder="Post title"
            required
            class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            name="body"
            placeholder="Post content"
            required
            rows={3}
            class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={createPostMutation.isPending}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {createPostMutation.isPending ? "Creating..." : "Create Post"}
          </button>
        </form>
        
        <Show when={createPostMutation.isSuccess}>
          <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            Post created successfully!
          </div>
        </Show>
      </div>
    </div>
  );
}

export function PlatformBrowserHttpDemo() {
  return (
    <Provider>
      <PlatformBrowserDemoContent />
    </Provider>
  );
}