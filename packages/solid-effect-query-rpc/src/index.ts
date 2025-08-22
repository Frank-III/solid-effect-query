// Main RPC exports
export {
  makeRpcHooks,
  createRpcQuery,
  createRpcMutation,
  type UseRpcQueryOpts,
  type UseRpcMutationOpts
} from './rpc'

// Re-export commonly used RPC types for convenience
export { Rpc, RpcClient, RpcGroup } from '@effect/rpc'