import { createInfiniteQuery, type QueryKey } from '@tanstack/solid-query'
import type * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Cause from 'effect/Cause'
import * as Either from 'effect/Either'
import * as Runtime from 'effect/Runtime'
import type { Accessor } from 'solid-js'

export interface CreateEffectInfiniteQueryOptions<
  TData,
  TError,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown
> {
  queryKey: TQueryKey
  queryFn: (context: { 
    pageParam: TPageParam
    signal?: AbortSignal 
  }) => Effect.Effect<TData, TError, any>
  initialPageParam: TPageParam
  getNextPageParam: (lastPage: TData, allPages: TData[], lastPageParam: TPageParam, allPageParams: TPageParam[]) => TPageParam | undefined
  getPreviousPageParam?: (firstPage: TData, allPages: TData[], firstPageParam: TPageParam, allPageParams: TPageParam[]) => TPageParam | undefined
  enabled?: boolean
  throwOnDefect?: boolean
  staleTime?: number
  gcTime?: number
  refetchInterval?: number | false
  refetchIntervalInBackground?: boolean
  refetchOnWindowFocus?: boolean | 'always'
  refetchOnReconnect?: boolean | 'always'
  refetchOnMount?: boolean | 'always'
  retry?: boolean | number | ((failureCount: number, error: Cause.Cause<TError>) => boolean)
  retryDelay?: number | ((retryAttempt: number, error: Cause.Cause<TError>) => number)
  networkMode?: 'online' | 'always' | 'offlineFirst'
  throwOnError?: boolean | ((error: Cause.Cause<TError>) => boolean)
  maxPages?: number
}

export function makeCreateEffectInfiniteQuery<
  R,
  MR extends Runtime.Runtime<R>
>(useEffectRuntime: () => MR) {
  return function createEffectInfiniteQuery<
    TData,
    TError,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown
  >(
    options: Accessor<CreateEffectInfiniteQueryOptions<TData, TError, TQueryKey, TPageParam>>
  ) {
    const runtime = useEffectRuntime()
    
    return createInfiniteQuery(() => {
      const opts = options()
      
      return {
        ...opts,
        queryFn: async ({ pageParam, signal }): Promise<TData> => {
          const result = await Runtime.runPromiseExit(runtime as any)(
            opts.queryFn({ pageParam: pageParam as TPageParam, signal })
          )
          
          if (Exit.isFailure(result)) {
            const cause = result.cause
            
            if (opts.throwOnDefect) {
              const failureOrCause = Cause.failureOrCause(cause)
              if (Either.isRight(failureOrCause)) {
                // It's a defect (die or interrupt), throw it
                throw cause
              }
              // It's a normal failure, throw the error
              throw Either.getLeft(failureOrCause)
            }
            
            // Always throw the full cause when not using throwOnDefect
            throw cause
          }
          
          return result.value as TData
        },
        throwOnError: opts.throwOnError
          ? typeof opts.throwOnError === 'function'
            ? (error: unknown) => {
                if (opts.throwOnDefect && Cause.isCause(error)) {
                  const failureOrCause = Cause.failureOrCause(error)
                  if (Either.isLeft(failureOrCause)) {
                    return (opts.throwOnError as Function)(Either.getLeft(failureOrCause))
                  }
                  return true // Always throw defects
                }
                return (opts.throwOnError as Function)(error)
              }
            : opts.throwOnError
          : false
      }
    })
  }
}