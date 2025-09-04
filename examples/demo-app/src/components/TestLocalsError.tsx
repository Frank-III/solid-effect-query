import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Layer, Logger } from "effect";

// Test different layer configurations to find what causes the "locals" error

// Test 1: Empty layer (this should work)
const test1 = makeEffectRuntime(() => Layer.empty);

// Test 2: Logger.pretty layer (this might cause locals error)
const test2 = makeEffectRuntime(() => Logger.pretty);

export function TestLocalsError() {
  const Test1Provider = test1.Provider;
  const Test2Provider = test2.Provider;
  
  return (
    <div class="space-y-4 p-6">
      <h2 class="text-xl font-bold">Testing "locals" Error</h2>
      
      <Test1Provider>
        <Test1Component />
      </Test1Provider>
      
      <Test2Provider>
        <Test2Component />
      </Test2Provider>
    </div>
  );
}

function Test1Component() {
  const query = test1.useEffectQuery(() => ({
    queryKey: ["test1"],
    queryFn: () => Effect.succeed("Test 1 works with empty layer!")
  }));
  
  return (
    <div class="p-4 border rounded">
      <h3 class="font-bold">Test 1: Empty Layer</h3>
      <p>Status: {query.isPending ? "Loading..." : query.isError ? "Error" : query.data}</p>
      {query.isError && <p class="text-red-500">{query.error?.toString()}</p>}
    </div>
  );
}

function Test2Component() {
  const query = test2.useEffectQuery(() => ({
    queryKey: ["test2"],
    queryFn: () => Effect.succeed("Test 2 with Logger.pretty layer")
  }));
  
  return (
    <div class="p-4 border rounded">
      <h3 class="font-bold">Test 2: Logger.pretty Layer</h3>
      <p>Status: {query.isPending ? "Loading..." : query.isError ? "Error" : query.data}</p>
      {query.isError && <p class="text-red-500">Error: {query.error?.toString()}</p>}
    </div>
  );
}