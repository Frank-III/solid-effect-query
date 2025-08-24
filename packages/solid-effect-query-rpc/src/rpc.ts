import * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Cause from "effect/Cause"
import * as Console from "effect/Console"
import type { UseQueryResult, UseMutationResult, SolidQueryOptions, SolidMutationOptions } from "@tanstack/solid-query"
import { makeUseEffectQuery, makeUseEffectMutation } from "solid-effect-query"
import type { ManagedRuntime } from "effect"
import type { Accessor } from "solid-js"

// Query options excluding queryKey and queryFn (we generate those)
export type UseRpcQueryOpts<TData = unknown, TError = unknown> = Omit<
  SolidQueryOptions<TData, Cause.Cause<TError>>,
  "queryKey" | "queryFn"
>

// Mutation options excluding mutationFn (we generate that)
export type UseRpcMutationOpts<
  TData = unknown,
  TError = unknown,
  TVariables = void
> = Omit<SolidMutationOptions<TData, Cause.Cause<TError>, TVariables>, "mutationFn">

/**
 * Creates RPC query and mutation hooks for a given client tag.
 * This follows the pattern from effect-react-query-rpc but adapted for Solid.
 * 
 * @example
 * ```typescript
 * // Define your RPC group
 * class MyRpcs extends RpcGroup.make(
 *   Rpc.make("getUser"),
 *   Rpc.make("createUser")
 * ) {}
 * 
 * // Create client tag
 * const MyRpcClient = Context.GenericTag<{
 *   readonly client: RpcClient.RpcClient.Flat<ExtractRpcs>
 * }>("MyRpcClient")
 * 
 * // Create hooks using makeEffectRuntime
 * const runtime = makeEffectRuntime(clientLayer)
 * const { useRpcQuery, useRpcMutation } = makeRpcHooks(MyRpcClient, () => runtime)
 * 
 * // Use in component
 * const userQuery = useRpcQuery("getUser", () => ({ id: 1 }))
 * const createUser = useRpcMutation("createUser")
 * ```
 */
export const makeRpcHooks = <
  I,
  S extends { readonly client: RpcClient.RpcClient.Flat<any> },
  Rpcs extends S extends { readonly client: RpcClient.RpcClient.Flat<infer R> }
    ? R
    : never
>(
  clientTag: Context.Tag<I, S>,
  useEffectRuntime: () => ManagedRuntime.ManagedRuntime<I, any>
) => {
  // Log initialization in Effect style (will be executed when the hooks are created)
  Effect.gen(function* () {
    yield* Effect.log("[RPC makeRpcHooks] Creating hooks")
    yield* Effect.log(`[RPC makeRpcHooks] clientTag: ${clientTag.key}`)
  }).pipe(Effect.runSync)
  
  const useEffectQuery = makeUseEffectQuery(useEffectRuntime as any)
  const useEffectMutation = makeUseEffectMutation(useEffectRuntime as any)

  const useRpcQuery = <
    const Tag extends Rpcs["_tag"],
    Current extends Rpc.ExtractTag<Rpcs, Tag>,
    Success extends Rpc.Success<Current>,
    Error extends Rpc.Error<Current>
  >(
    tag: Tag,
    payload: Accessor<Rpc.PayloadConstructor<Current>>,
    opts?: Accessor<UseRpcQueryOpts<Success, Error>>
  ): UseQueryResult<Success, Cause.Cause<Error>> => {
    return useEffectQuery(() => {
      const baseOptions = opts?.() || {}
      const currentPayload = payload()

      return {
        ...baseOptions,
        queryKey: [tag, currentPayload] as const,
        queryFn: () =>
          Effect.gen(function* () {
            yield* Effect.log(`[RPC Hook] Getting service for ${String(tag)}`)
            
            const service = yield* clientTag.pipe(
              Effect.tap((s) => Effect.log(`[RPC Hook] Service obtained for ${String(tag)}`)),
              Effect.catchTag("NoSuchElementException", (error) => 
                Effect.logError(`TasksClient service not found: ${error}`).pipe(
                  Effect.andThen(Effect.die(`TasksClient service not found`))
                )
              )
            )
            
            yield* Effect.log(`[RPC Hook] Calling RPC ${String(tag)}`, { payload: currentPayload })
            
            const result = yield* service.client(tag as any, currentPayload).pipe(
              Effect.tap((res) => Effect.log(`[RPC Hook] ${String(tag)} response received`)),
              Effect.tapError((err) => Effect.logError(`[RPC Hook] ${String(tag)} error:`, err))
            )
            
            return result
          })
      }
    })
  }

  const useRpcMutation = <
    const Tag extends Rpcs["_tag"],
    Current extends Rpc.ExtractTag<Rpcs, Tag>,
    Success extends Rpc.Success<Current>,
    Error extends Rpc.Error<Current>,
    Payload = Rpc.PayloadConstructor<Current>
  >(
    tag: Tag,
    opts?: Accessor<UseRpcMutationOpts<Success, Error, Payload>>
  ): UseMutationResult<Success, Cause.Cause<Error>, Payload> => {
    return useEffectMutation(() => {
      const baseOptions = opts?.() || {}

      // Convert the options to Effect-compatible format
      const effectOptions = {
        ...baseOptions,
        mutationFn: (payload: Payload) =>
          Effect.flatMap(clientTag, ({ client }) =>
            client(tag as any, payload)
          ),
        // Wrap callbacks to return Effects
        onMutate: baseOptions.onMutate
          ? (variables: Payload) => Effect.sync(() => baseOptions.onMutate!(variables))
          : undefined,
        onSuccess: baseOptions.onSuccess
          ? (data: Success, variables: Payload, context: any) =>
              Effect.sync(() => baseOptions.onSuccess!(data, variables, context))
          : undefined,
        onError: baseOptions.onError
          ? (error: Cause.Cause<Error>, variables: Payload, context: any) =>
              Effect.sync(() => baseOptions.onError!(error, variables, context))
          : undefined,
        onSettled: baseOptions.onSettled
          ? (data: Success | undefined, error: Cause.Cause<Error> | null, variables: Payload, context: any) =>
              Effect.sync(() => baseOptions.onSettled!(data, error, variables, context))
          : undefined
      }

      return effectOptions as any
    }) as UseMutationResult<Success, Cause.Cause<Error>, Payload>
  }

  return {
    useRpcQuery,
    useRpcMutation
  } as const
}

/**
 * Alternative API: Direct functions without factory
 * These can be used directly with any client tag and runtime
 */
export const createRpcQuery = <
  I,
  S extends { readonly client: RpcClient.RpcClient.Flat<any> },
  Rpcs extends S extends { readonly client: RpcClient.RpcClient.Flat<infer R> }
    ? R
    : never,
  const Tag extends Rpcs["_tag"],
  Current extends Rpc.ExtractTag<Rpcs, Tag>,
  Success extends Rpc.Success<Current>,
  Error extends Rpc.Error<Current>
>(
  clientTag: Context.Tag<I, S>,
  tag: Tag,
  payload: Accessor<Rpc.PayloadConstructor<Current>>,
  useEffectRuntime: () => ManagedRuntime.ManagedRuntime<I, any>,
  opts?: Accessor<UseRpcQueryOpts<Success, Error>>
): UseQueryResult<Success, Cause.Cause<Error>> => {
  const useEffectQuery = makeUseEffectQuery(useEffectRuntime as any)
  
  return useEffectQuery(() => {
    const baseOptions = opts?.() || {}
    const currentPayload = payload()

    return {
      ...baseOptions,
      queryKey: [tag, currentPayload] as const,
      queryFn: () =>
        Effect.flatMap(clientTag, ({ client }) =>
          client(tag as any, currentPayload)
        )
    }
  })
}

export const createRpcMutation = <
  I,
  S extends { readonly client: RpcClient.RpcClient.Flat<any> },
  Rpcs extends S extends { readonly client: RpcClient.RpcClient.Flat<infer R> }
    ? R
    : never,
  const Tag extends Rpcs["_tag"],
  Current extends Rpc.ExtractTag<Rpcs, Tag>,
  Success extends Rpc.Success<Current>,
  Error extends Rpc.Error<Current>,
  Payload = Rpc.PayloadConstructor<Current>
>(
  clientTag: Context.Tag<I, S>,
  tag: Tag,
  useEffectRuntime: () => ManagedRuntime.ManagedRuntime<I, any>,
  opts?: Accessor<UseRpcMutationOpts<Success, Error, Payload>>
): UseMutationResult<Success, Cause.Cause<Error>, Payload> => {
  const useEffectMutation = makeUseEffectMutation(useEffectRuntime as any)
  
  return useEffectMutation(() => {
    const baseOptions = opts?.() || {}

    // Convert the options to Effect-compatible format
    const effectOptions = {
      ...baseOptions,
      mutationFn: (payload: Payload) =>
        Effect.flatMap(clientTag, ({ client }) =>
          client(tag as any, payload)
        ),
      // Wrap callbacks to return Effects
      onMutate: baseOptions.onMutate
        ? (variables: Payload) => Effect.sync(() => baseOptions.onMutate!(variables))
        : undefined,
      onSuccess: baseOptions.onSuccess
        ? (data: Success, variables: Payload, context: any) =>
            Effect.sync(() => baseOptions.onSuccess!(data, variables, context))
        : undefined,
      onError: baseOptions.onError
        ? (error: Cause.Cause<Error>, variables: Payload, context: any) =>
            Effect.sync(() => baseOptions.onError!(error, variables, context))
        : undefined,
      onSettled: baseOptions.onSettled
        ? (data: Success | undefined, error: Cause.Cause<Error> | null, variables: Payload, context: any) =>
            Effect.sync(() => baseOptions.onSettled!(data, error, variables, context))
        : undefined
    }

    return effectOptions as any
  }) as UseMutationResult<Success, Cause.Cause<Error>, Payload>
}