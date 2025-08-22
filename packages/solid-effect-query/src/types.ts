import type * as Effect from 'effect/Effect'
import type * as Cause from 'effect/Cause'
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/solid-query'

export interface EffectQueryOptions<TData, TError, TQueryKey extends readonly unknown[] = readonly unknown[]> 
  extends Omit<UseQueryOptions<TData, Cause.Cause<TError>, TData, TQueryKey>, 'queryFn'> {
  queryFn: (context: { signal?: AbortSignal }) => Effect.Effect<TData, TError, any>
  throwOnDefect?: boolean
}

export interface EffectMutationOptions<TData, TError, TVariables = void, TContext = unknown>
  extends Omit<UseMutationOptions<TData, Cause.Cause<TError>, TVariables, TContext>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Effect.Effect<TData, TError, any>
  throwOnDefect?: boolean
}