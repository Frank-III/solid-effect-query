import { Schema, Effect, Context, Stream } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";

// Environment Services
export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly getUser: (
      id: number,
    ) => Effect.Effect<{ id: number; name: string; email: string }>;
    readonly saveUser: (user: {
      name: string;
      email: string;
    }) => Effect.Effect<{ id: number; name: string; email: string }>;
    readonly deleteUser: (id: number) => Effect.Effect<void>;
    readonly listUsers: () => Effect.Effect<
      Array<{ id: number; name: string; email: string }>
    >;
  }
>() {}

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    readonly getConfig: (key: string) => Effect.Effect<string>;
    readonly setConfig: (key: string, value: string) => Effect.Effect<void>;
    readonly getAllConfigs: () => Effect.Effect<Record<string, string>>;
  }
>() {}

export class LoggerService extends Context.Tag("LoggerService")<
  LoggerService,
  {
    readonly log: (
      level: "info" | "warn" | "error",
      message: string,
    ) => Effect.Effect<void>;
    readonly getLogs: () => Effect.Effect<
      Array<{ timestamp: Date; level: string; message: string }>
    >;
  }
>() {}

// User schema
export class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
}) {}

// Config schema
export class Config extends Schema.Class<Config>("Config")({
  key: Schema.String,
  value: Schema.String,
}) {}

// Log entry schema
export class LogEntry extends Schema.Class<LogEntry>("LogEntry")({
  timestamp: Schema.Date,
  level: Schema.String,
  message: Schema.String,
}) {}

// Health check response schema
export class HealthStatus extends Schema.Class<HealthStatus>("HealthStatus")({
  status: Schema.String,
  uptime: Schema.Number,
  services: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
}) {}

// Define RPC group for environment services
export class EnvironmentRpcs extends RpcGroup.make(
  // User operations
  Rpc.make("GetUser", {
    success: User,
    error: Schema.String,
    payload: {
      id: Schema.Number,
    },
  }),
  Rpc.make("CreateUser", {
    success: User,
    error: Schema.String,
    payload: {
      name: Schema.String,
      email: Schema.String,
    },
  }),
  Rpc.make("ListUsers", {
    success: User,
    stream: true,
  }),

  // Config operations
  Rpc.make("GetConfig", {
    success: Schema.String,
    error: Schema.String,
    payload: {
      key: Schema.String,
    },
  }),
  Rpc.make("SetConfig", {
    success: Schema.Void,
    error: Schema.String,
    payload: {
      key: Schema.String,
      value: Schema.String,
    },
  }),
  Rpc.make("GetAllConfigs", {
    success: Config,
    stream: true,
  }),

  // Logger operations
  Rpc.make("Log", {
    success: Schema.Void,
    error: Schema.String,
    payload: {
      level: Schema.Literal("info", "warn", "error"),
      message: Schema.String,
    },
  }),
  Rpc.make("GetLogs", {
    success: LogEntry,
    stream: true,
  }),

  // Health check
  Rpc.make("HealthCheck", {
    success: HealthStatus,
    error: Schema.String,
  }),
) {}

// Implementation layer
export const EnvironmentHandlersLive = EnvironmentRpcs.toLayer(
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const config = yield* ConfigService;
    const logger = yield* LoggerService;

    return {
      GetUser: ({ id }) => db.getUser(id),

      CreateUser: ({ name, email }) =>
        Effect.gen(function* () {
          const user = yield* db.saveUser({ name, email });
          yield* logger.log("info", `User created: ${user.id}`);
          return user;
        }),

      ListUsers: () =>
        db.listUsers().pipe(
          Effect.map((users) => Stream.fromIterable(users)),
          Mailbox.fromIterable,
        ),

      GetConfig: ({ key }) => config.getConfig(key),

      SetConfig: ({ key, value }) =>
        Effect.gen(function* () {
          yield* config.setConfig(key, value);
          yield* logger.log("info", `Config updated: ${key} = ${value}`);
        }),

      GetAllConfigs: () =>
        Effect.gen(function* () {
          const configs = yield* config.getAllConfigs();
          return Stream.fromIterable(
            Object.entries(configs).map(
              ([key, value]) => new Config({ key, value }),
            ),
          );
        }),

      Log: ({ level, message }) => logger.log(level, message),

      GetLogs: () => Stream.fromIterableEffect(logger.getLogs()),

      HealthCheck: () =>
        Effect.gen(function* () {
          const startTime = Date.now();

          const services: Record<string, boolean> = {
            database: true,
            config: true,
            logger: true,
          };

          return new HealthStatus({
            status: "healthy",
            uptime: Date.now() - startTime,
            services,
          });
        }),
    };
  }),
);
