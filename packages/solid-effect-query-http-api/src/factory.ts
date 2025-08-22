import type {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpClient,
  HttpClientError,
  Multipart,
} from "@effect/platform";
import { HttpApiClient } from "@effect/platform";
import { createMemo } from "solid-js";
import type { Accessor } from "solid-js";
import type {
  UseQueryResult,
  UseMutationResult,
  SolidQueryOptions,
  SolidMutationOptions,
} from "@tanstack/solid-query";
import { Effect, ManagedRuntime } from "effect";
import type { ParseResult, Stream } from "effect";
import * as Cause from "effect/Cause";
import type { Simplify } from "effect/Types";
import type { Brand } from "effect/Brand";
import { createQuery, createMutation } from "@tanstack/solid-query";

// Properly typed query options - exclude queryKey and queryFn as they're generated
export type UseHttpApiQueryOpts<TData = unknown, TError = unknown, R = never> = Omit<
  SolidQueryOptions<TData, TError>,
  "queryKey" | "queryFn"
> & {
  runtime: ManagedRuntime.ManagedRuntime<R, never>; // The ManagedRuntime instance
};

// Properly typed mutation options - exclude mutationFn as it's generated
export type UseHttpApiMutationOpts<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  R = never
> = Omit<SolidMutationOptions<TData, TError, TVariables>, "mutationFn"> & {
  runtime: ManagedRuntime.ManagedRuntime<R, never>; // The ManagedRuntime instance
};

// Factory to create HttpApi query hook
export const makeHttpApiQuery = <
  ApiId extends string,
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiE,
  ApiR,
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiE, ApiR>,
  options: {
    readonly baseUrl?: URL | string;
    readonly transformClient?: (
      client: HttpClient.HttpClient,
    ) => HttpClient.HttpClient;
  } = {},
) => {
  // Create the client effect once, outside the component
  const clientEffect = HttpApiClient.make(api, {
    baseUrl: options.baseUrl,
    transformClient: options.transformClient,
  });

  return <
    GroupName extends HttpApiGroup.HttpApiGroup.Name<Groups>,
    Name extends HttpApiEndpoint.HttpApiEndpoint.Name<
      HttpApiGroup.HttpApiGroup.Endpoints<Group>
    >,
    Group extends
      HttpApiGroup.HttpApiGroup.Any = HttpApiGroup.HttpApiGroup.WithName<
      Groups,
      GroupName
    >,
    Endpoint extends
      HttpApiEndpoint.HttpApiEndpoint.Any = HttpApiEndpoint.HttpApiEndpoint.WithName<
      HttpApiGroup.HttpApiGroup.Endpoints<Group>,
      Name
    >,
  >(
    group: GroupName,
    endpoint: Name,
    optionsAccessor: Accessor<
      [Endpoint] extends [
        HttpApiEndpoint.HttpApiEndpoint<
          infer _Name,
          infer _Method,
          infer _Path,
          infer _UrlParams,
          infer _Payload,
          infer _Headers,
          infer _Success,
          infer _Error,
          infer _R,
          infer _RE
        >,
      ]
        ? Simplify<
            UseHttpApiQueryOpts<
              _Success,
              | _Error
              | HttpApiGroup.HttpApiGroup.Error<Group>
              | ApiE
              | HttpClientError.HttpClientError
              | ParseResult.ParseError
            > &
              ([_Path] extends [never] ? {} : { readonly path: _Path }) &
              ([_UrlParams] extends [never]
                ? {}
                : { readonly urlParams: _UrlParams }) &
              ([_Payload] extends [never]
                ? {}
                : _Payload extends Brand<HttpApiSchema.MultipartStreamTypeId>
                  ? {
                      readonly payload: Stream.Stream<
                        Multipart.Part,
                        Multipart.MultipartError
                      >;
                    }
                  : { readonly payload: _Payload }) &
              ([_Headers] extends [never] ? {} : { readonly headers: _Headers })
          >
        : never
    >,
  ): [Endpoint] extends [
    HttpApiEndpoint.HttpApiEndpoint<
      infer _Name,
      infer _Method,
      infer _Path,
      infer _UrlParams,
      infer _Payload,
      infer _Headers,
      infer _Success,
      infer _Error,
      infer _R,
      infer _RE
    >,
  ]
    ? UseQueryResult<
        _Success,
        Cause.Cause<
          | _Error
          | HttpApiGroup.HttpApiGroup.Error<Group>
          | ApiE
          | HttpClientError.HttpClientError
          | ParseResult.ParseError
        >
      >
    : never => {
    const queryOptions = createMemo(() => {
      const opts = optionsAccessor();

      // Extract request parameters for the API call
      const { path, urlParams, payload, headers, runtime, ...queryOpts } = opts;

      // Auto-generate queryKey from group, endpoint, and parameters
      const queryKey = [
        "httpApi",
        group,
        endpoint,
        // Include parameters that affect the query result
        ...(path ? ["path", path] : []),
        ...(urlParams ? ["urlParams", urlParams] : []),
        ...(payload ? ["payload", payload] : []),
        // Note: headers typically don't affect caching, but can be included if needed
        ...(headers ? ["headers", headers] : []),
      ] as const;

      return {
        ...queryOpts, // Spread the solid-query options
        queryKey,
        queryFn: () =>
          runtime.runPromise(
            Effect.gen(function* () {
              const client = yield* clientEffect;
              const clientGroup = (client as any)[group];
              const clientEndpoint = clientGroup[endpoint];

              return yield* clientEndpoint({
                path,
                urlParams,
                payload,
                headers,
              });
            }).pipe(Effect.scoped) as Effect.Effect<any, unknown, never>
          ),
      };
    });

    return createQuery(() => queryOptions() as any) as any;
  };
};

// Factory to create HttpApi mutation hook
export const makeHttpApiMutation = <
  ApiId extends string,
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiE,
  ApiR,
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiE, ApiR>,
  options: {
    readonly baseUrl?: URL | string;
    readonly transformClient?: (
      client: HttpClient.HttpClient,
    ) => HttpClient.HttpClient;
  } = {},
) => {
  // Create the client effect once, outside the component
  const clientEffect = HttpApiClient.make(api, {
    baseUrl: options.baseUrl,
    transformClient: options.transformClient,
  });

  return <
    GroupName extends HttpApiGroup.HttpApiGroup.Name<Groups>,
    Name extends HttpApiEndpoint.HttpApiEndpoint.Name<
      HttpApiGroup.HttpApiGroup.Endpoints<Group>
    >,
    Group extends
      HttpApiGroup.HttpApiGroup.Any = HttpApiGroup.HttpApiGroup.WithName<
      Groups,
      GroupName
    >,
    Endpoint extends
      HttpApiEndpoint.HttpApiEndpoint.Any = HttpApiEndpoint.HttpApiEndpoint.WithName<
      HttpApiGroup.HttpApiGroup.Endpoints<Group>,
      Name
    >,
  >(
    group: GroupName,
    endpoint: Name,
    optionsAccessor: Accessor<
      [Endpoint] extends [
        HttpApiEndpoint.HttpApiEndpoint<
          infer _Name,
          infer _Method,
          infer _Path,
          infer _UrlParams,
          infer _Payload,
          infer _Headers,
          infer _Success,
          infer _Error,
          infer _R,
          infer _RE
        >,
      ]
        ? Simplify<
            UseHttpApiMutationOpts<
              _Success,
              | _Error
              | HttpApiGroup.HttpApiGroup.Error<Group>
              | ApiE
              | HttpClientError.HttpClientError
              | ParseResult.ParseError,
              Simplify<
                ([_Path] extends [never] ? {} : { readonly path: _Path }) &
                  ([_UrlParams] extends [never]
                    ? {}
                    : { readonly urlParams: _UrlParams }) &
                  ([_Payload] extends [never]
                    ? {}
                    : _Payload extends Brand<HttpApiSchema.MultipartStreamTypeId>
                      ? {
                          readonly payload: Stream.Stream<
                            Multipart.Part,
                            Multipart.MultipartError
                          >;
                        }
                      : { readonly payload: _Payload }) &
                  ([_Headers] extends [never]
                    ? {}
                    : { readonly headers: _Headers })
              >
            >
          >
        : never
    >,
  ): [Endpoint] extends [
    HttpApiEndpoint.HttpApiEndpoint<
      infer _Name,
      infer _Method,
      infer _Path,
      infer _UrlParams,
      infer _Payload,
      infer _Headers,
      infer _Success,
      infer _Error,
      infer _R,
      infer _RE
    >,
  ]
    ? UseMutationResult<
        _Success,
        Cause.Cause<
          | _Error
          | HttpApiGroup.HttpApiGroup.Error<Group>
          | ApiE
          | HttpClientError.HttpClientError
          | ParseResult.ParseError
        >,
        Simplify<
          ([_Path] extends [never] ? {} : { readonly path: _Path }) &
            ([_UrlParams] extends [never]
              ? {}
              : { readonly urlParams: _UrlParams }) &
            ([_Payload] extends [never]
              ? {}
              : _Payload extends Brand<HttpApiSchema.MultipartStreamTypeId>
                ? {
                    readonly payload: Stream.Stream<
                      Multipart.Part,
                      Multipart.MultipartError
                    >;
                  }
                : { readonly payload: _Payload }) &
            ([_Headers] extends [never] ? {} : { readonly headers: _Headers })
        >
      >
    : never => {
    const mutationOptions = createMemo(() => {
      const opts = optionsAccessor();
      const { runtime, ...mutationOpts } = opts;

      return {
        ...mutationOpts, // Spread the solid-query options
        mutationFn: (variables: any) =>
          runtime.runPromise(
            Effect.gen(function* () {
              const client = yield* clientEffect;
              const clientGroup = (client as any)[group];
              const clientEndpoint = clientGroup[endpoint];

              return yield* clientEndpoint({
                path: variables.path,
                urlParams: variables.urlParams,
                payload: variables.payload,
                headers: variables.headers,
              });
            }).pipe(Effect.scoped) as Effect.Effect<any, unknown, never>
          ),
      };
    });

    return createMutation(() => mutationOptions() as any) as any;
  };
};