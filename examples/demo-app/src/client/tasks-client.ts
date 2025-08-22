import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as RpcClient from '@effect/rpc/RpcClient'
import * as RpcSerialization from '@effect/rpc/RpcSerialization'
import * as FetchHttpClient from '@effect/platform/FetchHttpClient'
import { TasksRpc } from '../api/tasks.rpc'
import { makeRpcHooks } from 'solid-effect-query-rpc'

export class TasksClient extends Effect.Service<TasksClient>()('TasksClient', {
  scoped: Effect.all({
    client: RpcClient.make(TasksRpc, { flatten: true })
  }),
  dependencies: [
    RpcClient.layerProtocolHttp({
      url: 'http://localhost:3000/rpc'
    }).pipe(
      Layer.provide([
        FetchHttpClient.layer,
        RpcSerialization.layerJson
      ])
    )
  ]
}) {}

// Create runtime for RPC
const runtime = ManagedRuntime.make(TasksClient.Default)
const useEffectRuntime = () => runtime

// Create RPC hooks
const { useRpcQuery, useRpcMutation } = makeRpcHooks(TasksClient, useEffectRuntime)

export const useTasksQuery = useRpcQuery
export const useTasksMutation = useRpcMutation