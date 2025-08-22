import * as Layer from 'effect/Layer'
import * as RpcServer from '@effect/rpc/RpcServer'
import * as RpcSerialization from '@effect/rpc/RpcSerialization'
import { TasksRpc } from '../api/tasks.rpc'
import { TasksHandlers } from './tasks-handlers'

export const RpcServerLive = RpcServer.layer(TasksRpc).pipe(
  Layer.provide(TasksHandlers),
  Layer.provide(RpcSerialization.layerJson)
)