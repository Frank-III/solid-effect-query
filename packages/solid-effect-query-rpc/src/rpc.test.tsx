import { describe, it, expect, vi } from "vitest"
import { renderHook, waitFor } from "@solidjs/testing-library"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { EffectRuntimeProvider } from "solid-effect-query"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcTest from "@effect/rpc/RpcTest"
import * as Layer from "effect/Layer"
import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Cause from "effect/Cause"
import type { Component } from "solid-js"
import { createSignal } from "solid-js"
import { makeRpcHooks, createRpcQuery, createRpcMutation } from "./rpc"

// Define test RPC methods
class TestRpcs extends RpcGroup.make(
  Rpc.make("getUser"),
  Rpc.make("listUsers"),
  Rpc.make("createUser"),
  Rpc.make("updateUser")
) {}

// Extract RPC types
type ExtractRpcs = typeof TestRpcs extends RpcGroup.RpcGroup<infer A> ? A : never

// Create client tag
const TestRpcClient = Context.GenericTag<{
  readonly client: RpcClient.RpcClient.Flat<ExtractRpcs>
}>("TestRpcClient")

describe("RPC Hooks", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  })

  describe("makeRpcHooks factory", () => {
    it("should create working query hooks", async () => {
      // Mock RPC handlers
      const mockHandlers = {
        getUser: vi.fn(({ id }: { id: number }) =>
          Effect.succeed({ id, name: "John Doe", email: "john@example.com" })
        ),
        listUsers: vi.fn(() =>
          Effect.succeed([
            { id: 1, name: "John" },
            { id: 2, name: "Jane" }
          ])
        ),
        createUser: vi.fn(() => Effect.succeed({ id: 3, name: "Created" })),
        updateUser: vi.fn(() => Effect.succeed({ id: 1, name: "Updated" }))
      }

      // Create test layer
      const testLayer = Layer.scoped(
        TestRpcClient,
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(TestRpcs, { flatten: true }).pipe(
            Effect.provide(TestRpcs.toLayer(mockHandlers))
          )
          return { client }
        })
      )

      const runtime = await ManagedRuntime.make(testLayer).runtime()
      const { useRpcQuery } = makeRpcHooks(TestRpcClient)

      const wrapper: Component<{ children: any }> = (props) => (
        <QueryClientProvider client={queryClient}>
          <EffectRuntimeProvider runtime={runtime}>
            {props.children}
          </EffectRuntimeProvider>
        </QueryClientProvider>
      )

      const { result } = renderHook(
        () => {
          const [userId] = createSignal(1)
          return useRpcQuery("getUser", () => ({ id: userId() }))
        },
        { wrapper }
      )

      await waitFor(() => expect(result.isSuccess).toBe(true))
      
      expect(result.data).toEqual({
        id: 1,
        name: "John Doe",
        email: "john@example.com"
      })
      expect(mockHandlers.getUser).toHaveBeenCalledWith(
        { id: 1 },
        expect.objectContaining({ clientId: expect.any(Number), headers: expect.any(Object) })
      )
    })

    it("should create working mutation hooks", async () => {
      const mockHandlers = {
        getUser: vi.fn(() => Effect.fail("Not implemented")),
        listUsers: vi.fn(() => Effect.succeed([])),
        createUser: vi.fn((input: { name: string; email: string }) =>
          Effect.succeed({ id: 123, ...input })
        ),
        updateUser: vi.fn(() => Effect.succeed({ id: 1, name: "Updated" }))
      }

      const testLayer = Layer.scoped(
        TestRpcClient,
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(TestRpcs, { flatten: true }).pipe(
            Effect.provide(TestRpcs.toLayer(mockHandlers))
          )
          return { client }
        })
      )

      const runtime = await ManagedRuntime.make(testLayer).runtime()
      const { useRpcMutation } = makeRpcHooks(TestRpcClient)

      const wrapper: Component<{ children: any }> = (props) => (
        <QueryClientProvider client={queryClient}>
          <EffectRuntimeProvider runtime={runtime}>
            {props.children}
          </EffectRuntimeProvider>
        </QueryClientProvider>
      )

      const { result } = renderHook(
        () => useRpcMutation("createUser"),
        { wrapper }
      )

      result.mutate({ name: "New User", email: "new@example.com" })

      await waitFor(() => expect(result.isSuccess).toBe(true))
      
      expect(result.data).toEqual({
        id: 123,
        name: "New User",
        email: "new@example.com"
      })
      expect(mockHandlers.createUser).toHaveBeenCalledWith(
        { name: "New User", email: "new@example.com" },
        expect.objectContaining({ clientId: expect.any(Number), headers: expect.any(Object) })
      )
    })
  })

  describe("Direct functions", () => {
    it("should work with createRpcQuery", async () => {
      const mockHandlers = {
        getUser: vi.fn(({ id }: { id: number }) =>
          Effect.succeed({ id, name: `User ${id}` })
        ),
        listUsers: vi.fn(() => Effect.succeed([])),
        createUser: vi.fn(() => Effect.fail("Not implemented")),
        updateUser: vi.fn(() => Effect.fail("Not implemented"))
      }

      const testLayer = Layer.scoped(
        TestRpcClient,
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(TestRpcs, { flatten: true }).pipe(
            Effect.provide(TestRpcs.toLayer(mockHandlers))
          )
          return { client }
        })
      )

      const runtime = await ManagedRuntime.make(testLayer).runtime()

      const wrapper: Component<{ children: any }> = (props) => (
        <QueryClientProvider client={queryClient}>
          <EffectRuntimeProvider runtime={runtime}>
            {props.children}
          </EffectRuntimeProvider>
        </QueryClientProvider>
      )

      const { result } = renderHook(
        () => {
          const [userId, setUserId] = createSignal(1)
          const query = createRpcQuery(
            TestRpcClient,
            "getUser",
            () => ({ id: userId() })
          )
          return { query, setUserId }
        },
        { wrapper }
      )

      await waitFor(() => expect(result.query.isSuccess).toBe(true))
      expect(result.query.data).toEqual({ id: 1, name: "User 1" })

      // Test reactivity
      result.setUserId(2)
      await waitFor(() => 
        expect(result.query.data).toEqual({ id: 2, name: "User 2" })
      )
      expect(mockHandlers.getUser).toHaveBeenCalledTimes(2)
    })

    it("should work with createRpcMutation", async () => {
      const mockHandlers = {
        getUser: vi.fn(() => Effect.fail("Not implemented")),
        listUsers: vi.fn(() => Effect.succeed([])),
        createUser: vi.fn(() => Effect.fail("Not implemented")),
        updateUser: vi.fn((input: { id: number; name: string }) =>
          Effect.succeed({ ...input, updated: true })
        )
      }

      const testLayer = Layer.scoped(
        TestRpcClient,
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(TestRpcs, { flatten: true }).pipe(
            Effect.provide(TestRpcs.toLayer(mockHandlers))
          )
          return { client }
        })
      )

      const runtime = await ManagedRuntime.make(testLayer).runtime()

      const wrapper: Component<{ children: any }> = (props) => (
        <QueryClientProvider client={queryClient}>
          <EffectRuntimeProvider runtime={runtime}>
            {props.children}
          </EffectRuntimeProvider>
        </QueryClientProvider>
      )

      const { result } = renderHook(
        () => createRpcMutation(TestRpcClient, "updateUser"),
        { wrapper }
      )

      result.mutate({ id: 1, name: "Updated Name" })

      await waitFor(() => expect(result.isSuccess).toBe(true))
      
      expect(result.data).toEqual({
        id: 1,
        name: "Updated Name",
        updated: true
      })
    })
  })

  describe("Error handling", () => {
    it("should handle RPC errors correctly", async () => {
      const mockError = new Error("User not found")
      const mockHandlers = {
        getUser: vi.fn(() => Effect.fail(mockError)),
        listUsers: vi.fn(() => Effect.succeed([])),
        createUser: vi.fn(() => Effect.fail("Not implemented")),
        updateUser: vi.fn(() => Effect.fail("Not implemented"))
      }

      const testLayer = Layer.scoped(
        TestRpcClient,
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(TestRpcs, { flatten: true }).pipe(
            Effect.provide(TestRpcs.toLayer(mockHandlers))
          )
          return { client }
        })
      )

      const runtime = await ManagedRuntime.make(testLayer).runtime()
      const { useRpcQuery } = makeRpcHooks(TestRpcClient)

      const wrapper: Component<{ children: any }> = (props) => (
        <QueryClientProvider client={queryClient}>
          <EffectRuntimeProvider runtime={runtime}>
            {props.children}
          </EffectRuntimeProvider>
        </QueryClientProvider>
      )

      const { result } = renderHook(
        () => useRpcQuery("getUser", () => ({ id: 999 })),
        { wrapper }
      )

      await waitFor(() => expect(result.isError).toBe(true))
      
      // Error is wrapped in Cause
      expect(result.error).toBeDefined()
      if (result.error && Cause.isCause(result.error)) {
        const failures = Array.from(Cause.failures(result.error))
        expect(failures).toHaveLength(1)
        expect(failures[0].message).toBe(mockError.message)
      }
    })
  })
})