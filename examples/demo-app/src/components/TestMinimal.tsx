import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Layer } from "effect";

// Test with explicit types to see where the type information is lost

// Create a minimal runtime with explicit types
const minimalRuntime = makeEffectRuntime<never, never>(() => Layer.empty);

export function TestMinimal() {
  return (
    <minimalRuntime.Provider>
      <MinimalContent />
    </minimalRuntime.Provider>
  );
}

function MinimalContent() {
  // This should work with Layer.empty
  const query = minimalRuntime.useEffectQuery(() => ({
    queryKey: ["minimal-test"],
    queryFn: () => Effect.succeed("This should work!"),
  }));

  return (
    <div class="p-4 border rounded bg-gray-50">
      <h3 class="font-bold mb-2">Minimal Test (Explicit Types)</h3>
      <div class="space-y-2">
        <p>Status: {query.isPending ? "Loading..." : query.isError ? "Error" : "Success"}</p>
        {query.isError && <p class="text-red-500">Error: {query.error?.toString()}</p>}
        {query.isSuccess && <p class="text-green-500">Data: {query.data}</p>}
      </div>
    </div>
  );
}