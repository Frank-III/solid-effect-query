import { createSignal } from "solid-js";
import { makeEffectRuntime } from "solid-effect-query";
import { Effect, Layer } from "effect";

// Create minimal runtime
const { Provider, useEffectQuery } = makeEffectRuntime(() => Layer.empty);

function TestContent() {
  const [count, setCount] = createSignal(0);
  let queryCreationCount = 0;
  let queryExecutionCount = 0;

  console.log("[TestContent] Render");

  // Test 1: Direct accessor pattern (what SimpleEffectQueryDemo uses)
  const query = useEffectQuery(() => {
    queryCreationCount++;
    
    return {
      queryKey: ["test", count()],
      queryFn: () => {
        queryExecutionCount++;
        console.log(`[TestContent] Query function executed ${queryExecutionCount} times`);
        return Effect.succeed({ count: count(), time: Date.now() });
      }
    };
  });

  return (
    <div class="p-4 bg-white rounded shadow">
      <h3 class="font-bold mb-2">Infinite Loop Test</h3>
      <div class="space-y-2">
        <div>Count: {count()}</div>
        <div>Query Creation Count: {queryCreationCount}</div>
        <div>Query Execution Count: {queryExecutionCount}</div>
        <div>Query Status: {query.status}</div>
        <div>Query Data: {JSON.stringify(query.data)}</div>
        <button 
          onClick={() => setCount(c => c + 1)}
          class="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Increment Count
        </button>
      </div>
    </div>
  );
}

export function TestInfiniteLoop() {
  return (
    <Provider>
      <TestContent />
    </Provider>
  );
}