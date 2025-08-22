import { makeEffectRuntime } from 'solid-effect-query'
import * as FetchHttpClient from '@effect/platform/FetchHttpClient'

// Create a runtime with necessary services
export const runtime = makeEffectRuntime(() => FetchHttpClient.layer)