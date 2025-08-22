import * as Schema from "effect/Schema"
import * as RpcMiddleware from "@effect/rpc/RpcMiddleware"
import { CurrentUser } from "./Todo"

export class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {}) {}

export class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()("AuthMiddleware", {
  provides: CurrentUser,
  failure: Unauthorized,
  requiredForClient: true,
}) {}