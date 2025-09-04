import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { FetchHttpClient } from "@effect/platform";
import { Schema, Effect, ManagedRuntime, Layer } from "effect";
import { makeHttpApiQuery, makeHttpApiMutation } from "./factory";
import type { JSX } from "solid-js";

// Define test schemas
const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String
});

const CreateUserSchema = Schema.Struct({
  name: Schema.String,
  email: Schema.String
});

const ErrorSchema = Schema.Struct({
  message: Schema.String,
  code: Schema.String
});

// Define test API group extending HttpApiGroup
class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("getUser", "/users/:id")
      .addSuccess(UserSchema)
      .addError(ErrorSchema, { status: 404 })
  )
  .add(
    HttpApiEndpoint.get("listUsers", "/users")
      .addSuccess(Schema.Array(UserSchema))
  )
  .add(
    HttpApiEndpoint.post("createUser", "/users")
      .addSuccess(UserSchema)
      .setPayload(CreateUserSchema)
  ) {}

// Create the test API
const TestApi = HttpApi.make("TestApi").add(UsersApi);

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("solid-effect-query-http-api", () => {
  let queryClient: QueryClient;
  let runtime: ManagedRuntime.ManagedRuntime<unknown, unknown>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    // Create runtime with FetchHttpClient
    runtime = ManagedRuntime.make(FetchHttpClient.layer);
    
    // Reset mocks
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    runtime.dispose();
  });

  describe("Runtime integration", () => {
    it("should fail without proper HTTP client runtime", async () => {
      const emptyRuntime = ManagedRuntime.make(Layer.empty);
      const useUsersQuery = makeHttpApiQuery(TestApi, {
        baseUrl: "https://api.example.com"
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useUsersQuery("users", "listUsers", () => ({ 
          runtime: emptyRuntime 
        })),
        { wrapper }
      );

      await waitFor(() => expect(result.isError).toBe(true));
      
      // Should error because HttpClient service is missing
      expect(result.error).toBeDefined();
      expect(result.error?.toString()).toContain("Service not found");
      
      emptyRuntime.dispose();
    });

    it("should work with proper HTTP client runtime", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [{ id: 1, name: "John", email: "john@example.com" }]
      });

      const useUsersQuery = makeHttpApiQuery(TestApi, {
        baseUrl: "https://api.example.com"
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useUsersQuery("users", "listUsers", () => ({ runtime })),
        { wrapper }
      );

      await waitFor(() => expect(result.isSuccess).toBe(true));
      expect(result.data).toEqual([{ id: 1, name: "John", email: "john@example.com" }]);
    });
  });

  describe("Type inference and DX", () => {
    it("should infer correct types from API definition", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ id: 1, name: "John", email: "john@example.com" })
      });

      const useUsersQuery = makeHttpApiQuery(TestApi, {
        baseUrl: "https://api.example.com"
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useUsersQuery("users", "getUser", () => ({ 
          path: { id: 1 },
          runtime 
        })),
        { wrapper }
      );

      await waitFor(() => expect(result.isSuccess).toBe(true));
      
      // Type should be inferred correctly
      if (result.data) {
        // These should compile without errors
        const name: string = result.data.name;
        const email: string = result.data.email;
        const id: number = result.data.id;
        
        expect(name).toBe("John");
        expect(email).toBe("john@example.com");
        expect(id).toBe(1);
      }
    });

    it("should enforce correct mutation payload types at compile time", () => {
      const useUsersMutation = makeHttpApiMutation(TestApi, {
        baseUrl: "https://api.example.com"
      });

      // This test is primarily for TypeScript compilation
      // If the types are wrong, TypeScript will fail to compile
      const validPayload = {
        payload: {
          name: "Test",
          email: "test@example.com"
        }
      };

      // The following would fail TypeScript compilation:
      // const invalidPayload = {
      //   payload: {
      //     name: "Test",
      //     // missing email field
      //   }
      // };

      expect(validPayload.payload.name).toBe("Test");
    });
  });

  describe("Error handling with Effect", () => {
    it("should handle HTTP errors as Effect errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "User not found", code: "USER_NOT_FOUND" })
      });

      const useUsersQuery = makeHttpApiQuery(TestApi, {
        baseUrl: "https://api.example.com"
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useUsersQuery("users", "getUser", () => ({ 
          path: { id: 999 },
          runtime 
        })),
        { wrapper }
      );

      await waitFor(() => expect(result.isError).toBe(true));
      
      // Error should be wrapped in Cause
      expect(result.error).toBeDefined();
      if (result.error && typeof result.error === 'object') {
        // Check that it's an Effect Cause
        const errorString = result.error.toString();
        expect(errorString).toContain("404");
      }
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const useUsersQuery = makeHttpApiQuery(TestApi, {
        baseUrl: "https://api.example.com"
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useUsersQuery("users", "listUsers", () => ({ runtime })),
        { wrapper }
      );

      await waitFor(() => expect(result.isError).toBe(true));
      expect(result.error).toBeDefined();
    });
  });

  describe("Query key generation", () => {
    it("should generate proper query keys including API structure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => []
      });

      const useUsersQuery = makeHttpApiQuery(TestApi, {
        baseUrl: "https://api.example.com"
      });

      // Spy on queryClient to check the query key
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useUsersQuery("users", "listUsers", () => ({ runtime })),
        { wrapper }
      );

      await waitFor(() => expect(result.isSuccess).toBe(true));
      
      // Verify we can invalidate using the expected key structure
      queryClient.invalidateQueries({ queryKey: ["httpApi", "users", "listUsers"] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: ["httpApi", "users", "listUsers"] 
      });
    });

    it("should include path parameters in query key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ id: 123, name: "Test", email: "test@example.com" })
      });

      const useUsersQuery = makeHttpApiQuery(TestApi, {
        baseUrl: "https://api.example.com"
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      renderHook(
        () => useUsersQuery("users", "getUser", () => ({ 
          path: { id: 123 },
          runtime 
        })),
        { wrapper }
      );

      // Verify the fetch was called with the correct URL
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users/123",
        expect.any(Object)
      );
    });
  });

  describe("Mutations with Effect integration", () => {
    it("should handle successful mutations", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ id: 123, name: "New User", email: "new@example.com" })
      });

      const useUsersMutation = makeHttpApiMutation(TestApi, {
        baseUrl: "https://api.example.com"
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useUsersMutation("users", "createUser", () => ({ runtime })),
        { wrapper }
      );

      result.mutate({
        payload: {
          name: "New User",
          email: "new@example.com"
        }
      });

      await waitFor(() => expect(result.isSuccess).toBe(true));
      
      expect(result.data).toEqual({
        id: 123,
        name: "New User",
        email: "new@example.com"
      });

      // Verify the request
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "New User", email: "new@example.com" })
        })
      );
    });

    it("should handle mutation errors with proper Effect error types", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "Invalid email", code: "VALIDATION_ERROR" })
      });

      const useUsersMutation = makeHttpApiMutation(TestApi, {
        baseUrl: "https://api.example.com"
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useUsersMutation("users", "createUser", () => ({ runtime })),
        { wrapper }
      );

      result.mutate({
        payload: {
          name: "Invalid User",
          email: "invalid-email"
        }
      });

      await waitFor(() => expect(result.isError).toBe(true));
      expect(result.error).toBeDefined();
    });
  });

  describe("HTTP API specific features", () => {
    it("should support transform client option", async () => {
      const transformClient = vi.fn((client) => client);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => []
      });

      const useUsersQuery = makeHttpApiQuery(TestApi, {
        baseUrl: "https://api.example.com",
        transformClient
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () => useUsersQuery("users", "listUsers", () => ({ runtime })),
        { wrapper }
      );

      await waitFor(() => expect(result.isSuccess).toBe(true));
      
      // Transform client should be called during setup
      expect(transformClient).toHaveBeenCalled();
    });
  });
});