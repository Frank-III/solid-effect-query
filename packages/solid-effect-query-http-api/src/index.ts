// Factory functions for creating HttpApi query and mutation hooks
export { makeHttpApiQuery, makeHttpApiMutation } from './factory'
export type { UseHttpApiQueryOpts, UseHttpApiMutationOpts } from './factory'

// Re-export commonly used HttpApi types from @effect/platform
export { 
  HttpApi, 
  HttpApiGroup, 
  HttpApiEndpoint, 
  HttpApiClient,
  HttpApiSchema,
  HttpClient 
} from '@effect/platform'