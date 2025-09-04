import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Layer } from "effect";

// Test component to debug runtime issues

// Test 1: Empty layer (should work)
const test1 = makeEffectRuntime(() => Layer.empty);

// Create a component to test the runtime
export function TestRuntimeDebug() {
  
  return (
    <div class="p-6 space-y-4">
      <h2 class="text-xl font-bold">Testing Runtime Debug</h2>
      
      <test1.Provider>
        <TestContent />
      </test1.Provider>
    </div>
  );
}

function TestContent() {
  // Use the hook to test the runtime - this is properly memoized
  const query = test1.useEffectQuery(() => ({
    queryKey: ["test-debug"],
    queryFn: () => Effect.sync(() => "Debug test result")
  }));
  

  
  return (
    <div class="p-4 border rounded">
      <h3 class="font-bold mb-2">Runtime Debug Test</h3>
      <div class="space-y-2">
        <p>Status: {query.isPending ? "Loading..." : query.isError ? "Error" : "Success"}</p>
        {query.isError && (
          <div class="text-red-500">
            <p>Error: {query.error?.toString()}</p>
            <pre class="text-xs mt-2">{query.error instanceof Error ? query.error.stack : "No stack trace"}</pre>
          </div>
        )}
        {query.isSuccess && <p class="text-green-500">Data: {query.data}</p>}
      </div>
    </div>
  );
}