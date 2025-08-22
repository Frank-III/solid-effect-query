import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  dts: true,
  clean: true,
  target: "es2022",
  external: [
    "solid-js",
    "@tanstack/solid-query",
    "effect",
    "@effect/platform",
    "solid-effect-query",
  ],
});
