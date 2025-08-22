import { createSignal, Show } from "solid-js";
import { Effect } from "solid-effect-query";
import { runtime } from "../runtime";

// Create hooks using the runtime
const useEffectQuery = runtime.useEffectQuery;
const useEffectMutation = runtime.useEffectMutation;

// Simulated Effect-based API calls
const fetchData = Effect.fn(function* (id: string) {
  yield* Effect.sleep("1 second");
  return {
    message: `Data for ID: ${id}`,
    timestamp: Date.now(),
  };
}, Effect.withSpan("fetchData"));

const updateData = Effect.fn(function* (data: { id: string; value: string }) {
  yield* Effect.sleep("500 millis");
  if (Math.random() > 0.8) {
    return yield* Effect.fail(new Error("Random failure for demo"));
  }
  return {
    success: true,
    updated: data,
  };
});

export function EffectDemo() {
  const [itemId, setItemId] = createSignal("1");
  const [inputValue, setInputValue] = createSignal("");

  // Effect Query example
  const query = useEffectQuery(() => ({
    queryKey: ["effect-demo", itemId()],
    queryFn: () => fetchData(itemId()),
    enabled: itemId().length > 0,
    staleTime: 5000,
  }));

  // Effect Mutation example
  const mutation = useEffectMutation(() => ({
    mutationFn: updateData,
    onSuccess: (data) => Effect.log(data),
    onError: (error) => Effect.log(error),
  }));

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        "border-radius": "8px",
      }}
    >
      <h2>Pure Effect Query Demo</h2>

      <div style={{ "margin-bottom": "20px" }}>
        <input
          type="text"
          value={itemId()}
          onInput={(e) => setItemId(e.currentTarget.value)}
          placeholder="Enter ID"
          style={{ "margin-right": "10px", padding: "5px" }}
        />
        <button onClick={() => query.refetch()}>Refetch</button>
      </div>

      <div style={{ "margin-bottom": "20px" }}>
        <Show when={query.isLoading}>
          <p>Loading...</p>
        </Show>

        <Show when={query.isError}>
          <p style={{ color: "red" }}>Error: {query.error?.toString()}</p>
        </Show>

        <Show when={query.data}>
          <div
            style={{
              background: "#f0f0f0",
              padding: "10px",
              "border-radius": "4px",
            }}
          >
            <pre>{JSON.stringify(query.data, null, 2)}</pre>
          </div>
        </Show>
      </div>

      <div style={{ "border-top": "1px solid #ddd", "padding-top": "20px" }}>
        <h3>Mutation Example</h3>
        <div>
          <input
            type="text"
            value={inputValue()}
            onInput={(e) => setInputValue(e.currentTarget.value)}
            placeholder="Enter value to update"
            style={{ "margin-right": "10px", padding: "5px" }}
          />
          <button
            onClick={() =>
              mutation.mutate({ id: itemId(), value: inputValue() })
            }
            disabled={mutation.isPending || !inputValue()}
          >
            {mutation.isPending ? "Updating..." : "Update"}
          </button>
        </div>

        <Show when={mutation.isError}>
          <p style={{ color: "red" }}>
            Mutation error: {mutation.error?.toString()}
          </p>
        </Show>

        <Show when={mutation.isSuccess}>
          <p style={{ color: "green" }}>Update successful!</p>
        </Show>
      </div>
    </div>
  );
}
