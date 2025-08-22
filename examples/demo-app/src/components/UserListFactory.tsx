import { For, Show, createSignal } from "solid-js";
import { makeHttpApiQuery, makeHttpApiMutation } from "solid-effect-query-http-api";
import { UsersApi } from "../api/users.api";
import { useQueryClient } from "@tanstack/solid-query";
import { ManagedRuntime, Layer } from "effect";

// Create the hook factories with the API configuration
const useUsersQuery = makeHttpApiQuery(UsersApi, {
  baseUrl: "https://jsonplaceholder.typicode.com",
});

const useUsersMutation = makeHttpApiMutation(UsersApi, {
  baseUrl: "https://jsonplaceholder.typicode.com",
});

export function UserListFactory() {
  const [selectedUserId, setSelectedUserId] = createSignal<number | null>(null);
  const queryClient = useQueryClient();
  
  // Create a runtime for the HTTP API calls
  const runtime = ManagedRuntime.make(Layer.empty);

  // Query all users
  const usersQuery = useUsersQuery("users", "getUsers", () => ({
    queryKey: ["users-factory"],
    staleTime: 30000,
    runtime,
  }));

  // Query selected user
  const userQuery = useUsersQuery("users", "getUser", () => ({
    queryKey: ["user-factory", selectedUserId()],
    urlParams: { id: String(selectedUserId()!) },
    enabled: selectedUserId() !== null,
    runtime,
  }));

  // Delete user mutation
  const deleteUserMutation = useUsersMutation("users", "deleteUser", () => ({
    runtime,
    onSuccess: () => {
      console.log("User deleted successfully");
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ["users-factory"] });
      setSelectedUserId(null);
    },
    onError: (error) => {
      console.error("Failed to delete user:", error);
    },
  }));

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-2">HttpApi Factory Pattern Demo</h2>
      <p class="text-gray-600 text-sm mb-4">
        Using the new makeHttpApiQuery and makeHttpApiMutation factories
      </p>

      <div class="grid grid-cols-2 gap-6">
        <div>
          <h3 class="text-lg font-medium mb-3">User List</h3>

          <Show when={usersQuery.isLoading}>
            <div class="space-y-2">
              {[1, 2, 3].map(() => (
                <div class="animate-pulse">
                  <div class="h-12 bg-gray-200 rounded mb-2"></div>
                </div>
              ))}
            </div>
          </Show>

          <Show when={usersQuery.isError}>
            <div class="text-red-500 bg-red-50 p-3 rounded">
              Error loading users
            </div>
          </Show>

          <Show when={usersQuery.data}>
            <ul class="space-y-2">
              <For each={usersQuery.data}>
                {(user) => (
                  <li
                    class={`p-3 rounded cursor-pointer transition-colors ${
                      selectedUserId() === user.id
                        ? "bg-blue-100 border border-blue-300"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div class="font-medium">{user.name}</div>
                    <div class="text-sm text-gray-600">{user.email}</div>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div>
          <h3 class="text-lg font-medium mb-3">User Details</h3>

          <Show when={!selectedUserId()}>
            <p class="text-gray-500">Select a user to view details</p>
          </Show>

          <Show when={userQuery.isLoading}>
            <div class="animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </Show>

          <Show when={userQuery.data}>
            {(user) => (
              <div class="bg-gray-50 p-4 rounded">
                <h4 class="font-semibold text-lg mb-2">{user().name}</h4>
                <div class="space-y-1 text-sm">
                  <p>
                    <span class="font-medium">Username:</span> {user().username}
                  </p>
                  <p>
                    <span class="font-medium">Email:</span> {user().email}
                  </p>
                  <p>
                    <span class="font-medium">ID:</span> {user().id}
                  </p>
                </div>

                <button
                  onClick={() =>
                    deleteUserMutation.mutate({
                      urlParams: { id: String(user().id) },
                    })
                  }
                  disabled={deleteUserMutation.isPending}
                  class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                </button>
              </div>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
}