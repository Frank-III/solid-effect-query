import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import * as Schema from 'effect/Schema'

// User schema
export const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
  username: Schema.String
})

export type User = Schema.Schema.Type<typeof User>

// User API definition
export class UsersApi extends HttpApi.make("users")
  .add(
    HttpApiGroup.make("users")
      .add(
        HttpApiEndpoint.get("getUsers", "/users")
          .addSuccess(Schema.Array(User))
      )
      .add(
        HttpApiEndpoint.get("getUser", "/users/:id")
          .setUrlParams(Schema.Struct({ id: Schema.String }))
          .addSuccess(User)
      )
      .add(
        HttpApiEndpoint.post("createUser", "/users")
          .setPayload(User)
          .addSuccess(User)
      )
      .add(
        HttpApiEndpoint.put("updateUser", "/users/:id")
          .setUrlParams(Schema.Struct({ id: Schema.String }))
          .setPayload(User)
          .addSuccess(User)
      )
      .add(
        HttpApiEndpoint.del("deleteUser", "/users/:id")
          .setUrlParams(Schema.Struct({ id: Schema.String }))
          .addSuccess(Schema.Struct({ success: Schema.Boolean }))
      )
  ) {}