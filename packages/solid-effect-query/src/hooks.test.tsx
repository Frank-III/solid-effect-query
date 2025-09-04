import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { Effect, Context, Layer, Cause, Exit } from "effect";
import { makeEffectRuntime } from "./index.layer";
import type { JSX } from "solid-js";

// Test service definition
interface TestService {
  getUser: (
    id: number,
  ) => Effect.Effect<{ id: number; name: string }, "UserNotFound">;
  getUsers: () => Effect.Effect<Array<{ id: number; name: string }>, never>;
  createUser: (
    name: string,
  ) => Effect.Effect<{ id: number; name: string }, "ValidationError">;
  deleteUser: (
    id: number,
  ) => Effect.Effect<void, "UserNotFound" | "PermissionDenied">;
}

const TestService = Context.GenericTag<TestService>("TestService");

describe("solid-effect-query", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe("makeEffectRuntime", () => {
    it("should provide services via runtime context", async () => {
      const testServiceImpl: TestService = {
        getUser: (id) =>
          id === 999
            ? Effect.fail("UserNotFound" as const)
            : Effect.succeed({ id, name: `User ${id}` }),
        getUsers: () =>
          Effect.succeed([
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
          ]),
        createUser: (name) =>
          name.length < 3
            ? Effect.fail("ValidationError" as const)
            : Effect.succeed({ id: Date.now(), name }),
        deleteUser: (id) =>
          id === 999
            ? Effect.fail("UserNotFound" as const)
            : id === 403
              ? Effect.fail("PermissionDenied" as const)
              : Effect.succeed(undefined),
      };

      const ServiceLayer = Layer.succeed(TestService, testServiceImpl);
      const { Provider, useEffectQuery } = makeEffectRuntime(
        () => ServiceLayer,
      );

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useEffectQuery(() => ({
            queryKey: ["users"],
            queryFn: () =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.getUsers();
              }),
          })),
        { wrapper },
      );

      await waitFor(() => expect(result.isSuccess).toBe(true));
      expect(result.data).toEqual([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);
    });

    it("should handle multiple services in a layer", async () => {
      // Second service
      interface LogService {
        log: (message: string) => Effect.Effect<void>;
      }
      const LogService = Context.GenericTag<LogService>("LogService");

      const logs: string[] = [];
      const logServiceImpl: LogService = {
        log: (message) =>
          Effect.sync(() => {
            logs.push(message);
          }),
      };

      const testServiceImpl: TestService = {
        getUser: (id) => Effect.succeed({ id, name: `User ${id}` }),
        getUsers: () => Effect.succeed([]),
        createUser: () => Effect.fail("ValidationError" as const),
        deleteUser: () => Effect.succeed(undefined),
      };

      // Create a version that uses LogService
      const testServiceWithLogging = Layer.effect(
        TestService,
        Effect.gen(function* () {
          const logger = yield* LogService;
          return {
            getUser: (id: number) =>
              Effect.gen(function* () {
                yield* logger.log(`Getting user ${id}`);
                return { id, name: `User ${id}` };
              }),
            getUsers: () => Effect.succeed([]),
            createUser: () => Effect.fail("ValidationError" as const),
            deleteUser: () => Effect.succeed(undefined),
          } satisfies TestService;
        }),
      );

      const AppLayer = Layer.mergeAll(
        testServiceWithLogging,
        Layer.succeed(LogService, logServiceImpl),
      );

      const { Provider, useEffectQuery } = makeEffectRuntime(() => AppLayer);

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useEffectQuery(() => ({
            queryKey: ["user", 1],
            queryFn: () =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.getUser(1);
              }),
          })),
        { wrapper },
      );

      await waitFor(() => expect(result.isSuccess).toBe(true));
      expect(result.data).toEqual({ id: 1, name: "User 1" });
      expect(logs).toContain("Getting user 1");
    });
  });

  describe("useEffectQuery", () => {
    it("should handle Effect errors properly with throwOnDefect=false (default)", async () => {
      const testServiceImpl: TestService = {
        getUser: () => Effect.fail("UserNotFound" as const),
        getUsers: () => Effect.succeed([]),
        createUser: () => Effect.fail("ValidationError" as const),
        deleteUser: () => Effect.succeed(undefined),
      };

      const ServiceLayer = Layer.succeed(TestService, testServiceImpl);
      const { Provider, useEffectQuery } = makeEffectRuntime(
        () => ServiceLayer,
      );

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useEffectQuery(() => ({
            queryKey: ["user", 999],
            queryFn: () =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.getUser(999);
              }),
          })),
        { wrapper },
      );

      await waitFor(() => expect(result.isError).toBe(true));

      // Error should be wrapped in Cause
      expect(result.error).toBeDefined();
      if (result.error && Cause.isCause(result.error)) {
        const failures = Array.from(Cause.failures(result.error));
        expect(failures).toHaveLength(1);
        expect(failures[0]).toBe("UserNotFound");
      }
    });

    it("should handle Effect errors with throwOnDefect=true", async () => {
      const testServiceImpl: TestService = {
        getUser: () => Effect.fail("UserNotFound" as const),
        getUsers: () => Effect.succeed([]),
        createUser: () => Effect.fail("ValidationError" as const),
        deleteUser: () => Effect.succeed(undefined),
      };

      const ServiceLayer = Layer.succeed(TestService, testServiceImpl);
      const { Provider, useEffectQuery } = makeEffectRuntime(
        () => ServiceLayer,
      );

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useEffectQuery(() => ({
            queryKey: ["user", 999],
            queryFn: () =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.getUser(999);
              }),
            throwOnDefect: true,
          })),
        { wrapper },
      );

      await waitFor(() => expect(result.isError).toBe(true));

      // With throwOnDefect=true, only expected errors are exposed
      expect(result.error).toBe("UserNotFound");
    });

    it("should handle defects differently from expected errors", async () => {
      const testServiceImpl: TestService = {
        getUser: () => Effect.die("Unexpected crash!"),
        getUsers: () => Effect.succeed([]),
        createUser: () => Effect.fail("ValidationError" as const),
        deleteUser: () => Effect.succeed(undefined),
      };

      const ServiceLayer = Layer.succeed(TestService, testServiceImpl);
      const { Provider, useEffectQuery } = makeEffectRuntime(
        () => ServiceLayer,
      );

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      // With throwOnDefect=false
      const { result: resultWithCause } = renderHook(
        () =>
          useEffectQuery(() => ({
            queryKey: ["user-defect", 1],
            queryFn: () =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.getUser(1);
              }),
            throwOnDefect: false,
          })),
        { wrapper },
      );

      await waitFor(() => expect(resultWithCause.isError).toBe(true));
      expect(Cause.isCause(resultWithCause.error)).toBe(true);

      // With throwOnDefect=true, defects should throw
      const onError = vi.fn();
      const { result: resultThrows } = renderHook(
        () =>
          useEffectQuery(() => ({
            queryKey: ["user-defect-throw", 1],
            queryFn: () =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.getUser(1);
              }),
            throwOnDefect: true,
            throwOnError: false, // Prevent throwing to test the error
            onError,
          })),
        { wrapper },
      );

      await waitFor(() => expect(resultThrows.isError).toBe(true));
    });

    it("should abort long-running effects on unmount", async () => {
      let cleanedUp = false;

      const testServiceImpl: TestService = {
        getUser: () =>
          Effect.gen(function* () {
            yield* Effect.sleep("100 millis");
            return { id: 1, name: "Test" };
          }).pipe(
            Effect.onInterrupt(() =>
              Effect.sync(() => {
                cleanedUp = true;
              }),
            ),
          ),
        getUsers: () => Effect.succeed([]),
        createUser: () => Effect.fail("ValidationError" as const),
        deleteUser: () => Effect.succeed(undefined),
      };

      const ServiceLayer = Layer.succeed(TestService, testServiceImpl);
      const { Provider, useEffectQuery } = makeEffectRuntime(
        () => ServiceLayer,
      );

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      const { unmount } = renderHook(
        () =>
          useEffectQuery(() => ({
            queryKey: ["interruptible"],
            queryFn: () =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.getUser(1);
              }),
          })),
        { wrapper },
      );

      // Unmount before effect completes
      unmount();

      // Give time for cleanup
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(cleanedUp).toBe(true);
    });
  });

  describe("useEffectMutation", () => {
    it("should handle mutations with proper error handling", async () => {
      const testServiceImpl: TestService = {
        getUser: () => Effect.fail("UserNotFound" as const),
        getUsers: () => Effect.succeed([]),
        createUser: (name) =>
          name.length < 3
            ? Effect.fail("ValidationError" as const)
            : Effect.succeed({ id: Date.now(), name }),
        deleteUser: () => Effect.succeed(undefined),
      };

      const ServiceLayer = Layer.succeed(TestService, testServiceImpl);
      const { Provider, useEffectMutation } = makeEffectRuntime(
        () => ServiceLayer,
      );

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useEffectMutation(() => ({
            mutationFn: (name: string) =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.createUser(name);
              }),
          })),
        { wrapper },
      );

      // Test successful mutation
      result.mutate("Alice");
      await waitFor(() => expect(result.isSuccess).toBe(true));
      expect(result.data).toMatchObject({ name: "Alice" });

      // Reset and test failed mutation
      result.reset();
      result.mutate("Al"); // Too short
      await waitFor(() => expect(result.isError).toBe(true));

      // Error is wrapped in Cause by default
      expect(Cause.isCause(result.error)).toBe(true);
    });

    it("should return Exit type from mutateAsync", async () => {
      const testServiceImpl: TestService = {
        getUser: () => Effect.fail("UserNotFound" as const),
        getUsers: () => Effect.succeed([]),
        createUser: (name) => Effect.succeed({ id: 1, name }),
        deleteUser: () => Effect.succeed(undefined),
      };

      const ServiceLayer = Layer.succeed(TestService, testServiceImpl);
      const { Provider, useEffectMutation } = makeEffectRuntime(
        () => ServiceLayer,
      );

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useEffectMutation(() => ({
            mutationFn: (name: string) =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.createUser(name);
              }),
          })),
        { wrapper },
      );

      const exit = await result.mutateAsync("Test");

      // Should return Exit type
      expect(Exit.isExit(exit)).toBe(true);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toEqual({ id: 1, name: "Test" });
      }
    });

    it("should handle Effect lifecycle hooks", async () => {
      const events: string[] = [];

      const testServiceImpl: TestService = {
        getUser: () => Effect.fail("UserNotFound" as const),
        getUsers: () => Effect.succeed([]),
        createUser: (name) => Effect.succeed({ id: 1, name }),
        deleteUser: () => Effect.succeed(undefined),
      };

      const ServiceLayer = Layer.succeed(TestService, testServiceImpl);
      const { Provider, useEffectMutation } = makeEffectRuntime(
        () => ServiceLayer,
      );

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useEffectMutation(() => ({
            mutationFn: (name: string) =>
              Effect.gen(function* () {
                const service = yield* TestService;
                return yield* service.createUser(name);
              }),
            onMutate: (name) =>
              Effect.sync(() => {
                events.push(`onMutate: ${name}`);
                return { contextValue: name };
              }),
            onSuccess: (data, _variables, context) =>
              Effect.sync(() => {
                events.push(
                  `onSuccess: ${data.name}, context: ${context?.contextValue}`,
                );
              }),
            onSettled: (data, _error, _variables, _context) =>
              Effect.sync(() => {
                events.push(`onSettled: ${data?.name || "error"}`);
              }),
          })),
        { wrapper },
      );

      result.mutate("Bob");
      await waitFor(() => expect(result.isSuccess).toBe(true));

      expect(events).toEqual([
        "onMutate: Bob",
        "onSuccess: Bob, context: Bob",
        "onSettled: Bob",
      ]);
    });
  });

  describe("Type safety", () => {
    it("should maintain type safety across service boundaries", () => {
      // This is primarily a compile-time test
      const ServiceLayer = Layer.succeed(TestService, {
        getUser: (id: number) => Effect.succeed({ id, name: `User ${id}` }),
        getUsers: () => Effect.succeed([]),
        createUser: (name: string) => Effect.succeed({ id: 1, name }),
        deleteUser: () => Effect.succeed(undefined),
      });

      const { useEffectQuery, useEffectMutation } = makeEffectRuntime(
        () => ServiceLayer,
      );

      // These should compile without errors
      const queryHook = () =>
        useEffectQuery(() => ({
          queryKey: ["test"],
          queryFn: () =>
            Effect.gen(function* () {
              const service = yield* TestService;
              const user = yield* service.getUser(1);
              // TypeScript knows user has { id: number; name: string }
              return user.name;
            }),
        }));

      const mutationHook = () =>
        useEffectMutation(() => ({
          mutationFn: (name: string) =>
            Effect.gen(function* () {
              const service = yield* TestService;
              // TypeScript enforces the parameter type
              return yield* service.createUser(name);
            }),
        }));

      expect(typeof queryHook).toBe("function");
      expect(typeof mutationHook).toBe("function");
    });
  });

  describe("Runtime lifecycle", () => {
    it("should properly dispose runtime on Provider unmount", async () => {
      let disposed = false;

      const ServiceWithCleanup = Context.GenericTag<{ cleanup: () => void }>(
        "ServiceWithCleanup",
      );

      const ServiceLayer = Layer.scoped(
        ServiceWithCleanup,
        Effect.acquireRelease(Effect.succeed({ cleanup: () => {} }), () =>
          Effect.sync(() => {
            disposed = true;
          }),
        ),
      );

      const { Provider } = makeEffectRuntime(() => ServiceLayer);

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      );

      const { unmount } = renderHook(() => null, { wrapper });

      expect(disposed).toBe(false);
      unmount();

      // Give time for cleanup
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(disposed).toBe(true);
    });
  });
});
