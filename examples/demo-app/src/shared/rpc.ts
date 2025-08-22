import { Schema, Effect, Layer } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";

export class CalculatorRpcs extends RpcGroup.make(
  Rpc.make("Calculator", {
    success: Schema.Number,
    error: Schema.String,
    payload: {
      a: Schema.Number,
      b: Schema.Number,
      operation: Schema.Literal("add", "subtract", "multiply", "divide"),
    },
  }),
  Rpc.make("RandomNumber", {
    success: Schema.Number,
    error: Schema.String,
    payload: {
      min: Schema.Number,
      max: Schema.Number,
    },
  }),
  Rpc.make("Fibonacci", {
    success: Schema.Number,
    error: Schema.String,
    payload: {
      n: Schema.Number,
    },
  }),
) {}

export const CalculatorLive = CalculatorRpcs.toLayer(
  Effect.succeed({
    Calculator: ({ a, b, operation }) => {
      switch (operation) {
        case "add":
          return Effect.succeed(a + b);
        case "subtract":
          return Effect.succeed(a - b);
        case "multiply":
          return Effect.succeed(a * b);
        case "divide":
          if (b === 0) return Effect.fail("Division by zero");
          return Effect.succeed(a / b);
      }
    },
    RandomNumber: ({ min, max }) => {
      return Effect.succeed(Math.floor(Math.random() * (max - min + 1)) + min);
    },
    Fibonacci: ({ n }) => {
      if (n < 0) return Effect.fail("n must be non-negative");
      if (n <= 1) return Effect.succeed(n);
      let a = 0,
        b = 1;
      for (let i = 2; i <= n; i++) {
        const temp = a + b;
        a = b;
        b = temp;
      }
      return Effect.succeed(b);
    },
  }),
);
