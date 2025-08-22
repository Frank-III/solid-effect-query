# solid-effect-query-http-api

Effect HttpApi integration for solid-effect-query.

## Installation

```bash
pnpm add solid-effect-query-http-api @effect/platform
```

## Usage

### Basic Example

```typescript
import { HttpApi, HttpApiGroup, HttpApiEndpoint } from "@effect/platform";
import { makeHttpApiQuery, makeHttpApiMutation } from "solid-effect-query-http-api";
import { Schema } from "effect";

// Define your API
const UsersApi = HttpApi.make("UsersApi").pipe(
  HttpApi.addGroup(
    HttpApiGroup.make("users").pipe(
      HttpApiGroup.add(
        HttpApiEndpoint.get("getUser", "/:id").pipe(
          HttpApiEndpoint.setSchema({
            path: Schema.Struct({ id: Schema.NumberFromString }),
            success: Schema.Struct({
              id: Schema.Number,
              name: Schema.String,
              email: Schema.String
            })
          })
        )
      ),
      HttpApiGroup.add(
        HttpApiEndpoint.post("createUser", "/").pipe(
          HttpApiEndpoint.setSchema({
            body: Schema.Struct({
              name: Schema.String,
              email: Schema.String
            }),
            success: Schema.Struct({
              id: Schema.Number,
              name: Schema.String,
              email: Schema.String
            })
          })
        )
      )
    )
  )
);

// Create hooks
const useUsersQuery = makeHttpApiQuery(UsersApi, {
  baseUrl: "https://api.example.com"
});

const useUsersMutation = makeHttpApiMutation(UsersApi, {
  baseUrl: "https://api.example.com"
});

// Use in components
const UserDetail = (props) => {
  const userQuery = useUsersQuery("users", "getUser", () => ({
    path: { id: props.userId },
    // Standard solid-query options
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  }));

  return (
    <div>
      {userQuery.isLoading && <p>Loading...</p>}
      {userQuery.data && (
        <div>
          <h3>{userQuery.data.name}</h3>
          <p>{userQuery.data.email}</p>
        </div>
      )}
      {userQuery.error && <p>Error: {userQuery.error.message}</p>}
    </div>
  );
};

const CreateUserForm = () => {
  const createUser = useUsersMutation("users", "createUser");

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    createUser.mutate({
      payload: {
        name: formData.get("name"),
        email: formData.get("email")
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? "Creating..." : "Create User"}
      </button>
      {createUser.isSuccess && <p>User created!</p>}
    </form>
  );
};
```

## API Reference

### `makeHttpApiQuery`

Creates a query hook factory for an HttpApi.

```typescript
const useQuery = makeHttpApiQuery(api, {
  baseUrl?: string | URL,
  transformClient?: (client: HttpClient) => HttpClient
});

// Usage
const result = useQuery(group, endpoint, () => ({
  // Request parameters
  path?: {},
  urlParams?: {},
  payload?: {},
  headers?: {},
  // Solid Query options
  enabled?: boolean,
  staleTime?: number,
  gcTime?: number,
  refetchOnWindowFocus?: boolean,
  // ... other solid-query options
}));
```

### `makeHttpApiMutation`

Creates a mutation hook factory for an HttpApi.

```typescript
const useMutation = makeHttpApiMutation(api, {
  baseUrl?: string | URL,
  transformClient?: (client: HttpClient) => HttpClient
});

// Usage
const mutation = useMutation(group, endpoint, () => ({
  // Solid Query mutation options
  onSuccess?: (data) => void,
  onError?: (error) => void,
  onSettled?: (data, error) => void,
  // ... other solid-query mutation options
}));

// Execute mutation
mutation.mutate({
  path?: {},
  urlParams?: {},
  payload?: {},
  headers?: {}
});
```

## Features

- **Full TypeScript support** - Type inference from your HttpApi definition
- **Automatic query key generation** - Based on group, endpoint, and parameters
- **Solid Query integration** - Support for all solid-query options
- **Effect error handling** - Errors are returned as Effect Cause objects
- **Request transformation** - Via `transformClient` option
- **Flexible configuration** - Headers, URL params, path params, and body support

## Error Handling

Errors are returned as Effect Cause objects, which contain the full error context. To extract just the business errors, use `throwOnDefect: true`:

```typescript
const userQuery = useUsersQuery("users", "getUser", () => ({
  path: { id: props.userId },
  throwOnDefect: true // Only throw on defects, not business errors
}));

// Now userQuery.error will be the actual error type, not a Cause
```

## Advanced Usage

### Custom Headers

```typescript
const userQuery = useUsersQuery("users", "getUser", () => ({
  path: { id: 1 },
  headers: {
    "X-Custom-Header": "value",
    "Authorization": `Bearer ${token}`
  }
}));
```

### Transform Client

```typescript
import { HttpClient } from "@effect/platform";

const useApi = makeHttpApiQuery(UsersApi, {
  baseUrl: "https://api.example.com",
  transformClient: (client) => 
    client.pipe(
      HttpClient.filterStatusOk,
      HttpClient.timeout("30 seconds")
    )
});
```

### Optimistic Updates

```typescript
const queryClient = useQueryClient();
const createUser = useUsersMutation("users", "createUser", () => ({
  onMutate: async (variables) => {
    await queryClient.cancelQueries({ queryKey: ["httpApi", "users"] });
    
    const previousUsers = queryClient.getQueryData(["httpApi", "users", "listUsers"]);
    
    queryClient.setQueryData(["httpApi", "users", "listUsers"], old => [
      ...old,
      { ...variables.payload, id: Date.now() }
    ]);
    
    return { previousUsers };
  },
  onError: (err, variables, context) => {
    if (context?.previousUsers) {
      queryClient.setQueryData(["httpApi", "users", "listUsers"], context.previousUsers);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["httpApi", "users"] });
  }
}));
```

## Runtime Requirements

This package requires an `EffectRuntimeProvider` from `solid-effect-query` to be present in your component tree:

```typescript
import { EffectRuntimeProvider } from "solid-effect-query";
import { ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(Layer.empty);

const App = () => (
  <EffectRuntimeProvider runtime={runtime}>
    {/* Your app components */}
  </EffectRuntimeProvider>
);
```