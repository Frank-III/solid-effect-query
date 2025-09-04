import { Effect, Layer, ManagedRuntime, Runtime } from "effect";
import { createSignal } from "solid-js";

export function TestRuntime() {
  const [result, setResult] = createSignal<string>("Not run yet");
  const [error, setError] = createSignal<string | null>(null);

  const testManagedRuntime = () => {
    try {
      console.log("Creating ManagedRuntime...");
      const runtime = ManagedRuntime.make(Layer.empty);
      console.log("ManagedRuntime created:", runtime);
      
      console.log("Getting runPromiseExit...");
      const runPromiseExit = Runtime.runPromiseExit(runtime as any);
      console.log("runPromiseExit obtained");
      
      console.log("Creating effect...");
      const effect = Effect.succeed("Success from ManagedRuntime!");
      
      console.log("Running effect...");
      runPromiseExit(effect).then(exit => {
        console.log("Effect completed:", exit);
        if (exit._tag === "Success") {
          setResult(exit.value);
        }
      }).catch((e: any) => {
        console.error("Promise rejected:", e);
        setError(e.toString());
      });
    } catch (e: any) {
      console.error("Sync error:", e);
      setError(e.toString());
    }
  };

  const testDirectRunPromise = () => {
    try {
      console.log("Running effect directly with Effect.runPromise...");
      const effect = Effect.succeed("Success from direct runPromise!");
      
      Effect.runPromise(effect).then(value => {
        console.log("Direct effect completed:", value);
        setResult(value);
      }).catch((e: any) => {
        console.error("Direct promise rejected:", e);
        setError(e.toString());
      });
    } catch (e: any) {
      console.error("Direct sync error:", e);
      setError(e.toString());
    }
  };

  const testSimpleRuntime = () => {
    try {
      console.log("Creating simple runtime...");
      const runtime = Runtime.defaultRuntime;
      console.log("Simple runtime created:", runtime);
      
      console.log("Getting runPromise from simple runtime...");
      const runPromise = Runtime.runPromise(runtime);
      console.log("runPromise obtained");
      
      console.log("Creating and running effect...");
      const effect = Effect.succeed("Success from simple runtime!");
      
      runPromise(effect).then(value => {
        console.log("Simple runtime effect completed:", value);
        setResult(value);
      }).catch((e: any) => {
        console.error("Simple runtime promise rejected:", e);
        setError(e.toString());
      });
    } catch (e: any) {
      console.error("Simple runtime sync error:", e);
      setError(e.toString());
    }
  };

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Runtime Test</h2>
      
      <div class="space-y-4">
        <button
          onClick={testManagedRuntime}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test ManagedRuntime
        </button>
        
        <button
          onClick={testDirectRunPromise}
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Direct Effect.runPromise
        </button>
        
        <button
          onClick={testSimpleRuntime}
          class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Simple Runtime
        </button>
        
        <div class="mt-4">
          <p class="font-medium">Result:</p>
          <p class="text-green-600">{result()}</p>
          {error() && (
            <p class="text-red-600 mt-2">Error: {error()}</p>
          )}
        </div>
      </div>
    </div>
  );
}