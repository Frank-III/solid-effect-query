import { For, Show, createSignal } from "solid-js";
import { makeHttpApiQuery, makeHttpApiMutation } from "solid-effect-query-http-api";
import { UsersApi } from "../api/users.api";
import { ManagedRuntime, Layer } from "effect";

// Create query and mutation hooks for the Users API
const useUsersQuery = makeHttpApiQuery(UsersApi, {
  baseUrl: "https://jsonplaceholder.typicode.com"
});

const useUsersMutation = makeHttpApiMutation(UsersApi, {
  baseUrl: "https://jsonplaceholder.typicode.com"
});

export function UserList() {
  const [selectedUserId, setSelectedUserId] = createSignal<number | null>(null);
  
  // Create a runtime for the HTTP API calls
  const runtime = ManagedRuntime.make(Layer.empty);

  // Query all users
  const usersQuery = useUsersQuery("users", "getUsers", () => ({
    staleTime: 30000,
    runtime,
  }));

  // Query selected user
  const userQuery = useUsersQuery("users", "getUser", () => ({
    urlParams: { id: String(selectedUserId()!) },
    enabled: selectedUserId() !== null,
    runtime,
  }));

  // Delete user mutation
  const deleteUserMutation = useUsersMutation("users", "deleteUser", () => ({
    runtime,
    onSuccess: () => {
      console.log("User deleted successfully");
      usersQuery.refetch();
      setSelectedUserId(null);
    },
    onError: (error: any) => {
      console.error("Failed to delete user:", error);
    },
  }));

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        "border-radius": "8px",
      }}
    >
      <h2>HttpApi Users Demo</h2>

      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <h3>User List</h3>

          <Show when={usersQuery.isLoading}>
            <p>Loading users...</p>
          </Show>

          <Show when={usersQuery.error}>
            <p style={{ color: "red" }}>Error loading users</p>
          </Show>

          <Show when={usersQuery.data}>
            <ul style={{ "list-style": "none", padding: 0 }}>
              <For each={usersQuery.data}>
                {(user) => (
                  <li
                    style={{
                      padding: "10px",
                      margin: "5px 0",
                      background:
                        selectedUserId() === user.id ? "#e0e0e0" : "#f5f5f5",
                      cursor: "pointer",
                      "border-radius": "4px",
                    }}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <strong>{user.name}</strong>
                    <br />
                    <small>{user.email}</small>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div style={{ flex: 1 }}>
          <h3>User Details</h3>

          <Show when={!selectedUserId()}>
            <p style={{ color: "#666" }}>Select a user to view details</p>
          </Show>

          <Show when={userQuery.isLoading}>
            <p>Loading user details...</p>
          </Show>

          <Show when={userQuery.data}>
            {(user) => (
              <div
                style={{
                  background: "#f0f0f0",
                  padding: "15px",
                  "border-radius": "4px",
                }}
              >
                <h4>{user().name}</h4>
                <p>Username: {user().username}</p>
                <p>Email: {user().email}</p>
                <p>ID: {user().id}</p>

                <button
                  onClick={() =>
                    deleteUserMutation.mutate({
                      urlParams: { id: String(user().id) },
                    })
                  }
                  disabled={deleteUserMutation.isPending}
                  style={{
                    "margin-top": "10px",
                    padding: "5px 10px",
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    "border-radius": "4px",
                    cursor: deleteUserMutation.isPending
                      ? "not-allowed"
                      : "pointer",
                  }}
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