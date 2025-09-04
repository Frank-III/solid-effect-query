import { createSignal, onMount, createEffect, Show, For, createMemo, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import * as Cause from "effect/Cause";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "LOG" | "INFO" | "WARN" | "ERROR";
  message: string;
}

export function DebugConsole() {
  // Dev-only: do not render in production builds
  // @ts-ignore - Vite specific
  if (import.meta.env?.PROD) return null;

  // Use store for better performance with large arrays
  const [logStore, setLogStore] = createStore<{ entries: LogEntry[], nextId: number }>({
    entries: [],
    nextId: 0
  });

  // Memoized signal for localStorage with better SolidJS patterns
  const [isOpen, setIsOpen] = createSignal<boolean>(
    localStorage.getItem("debug-console-open") !== "0"
  );

  // Auto-save preference when it changes
  createEffect(() => {
    localStorage.setItem("debug-console-open", isOpen() ? "1" : "0");
  });

  // Memoized log count
  const logCount = createMemo(() => logStore.entries.length);

  // Ref for auto-scroll
  let consoleContentRef: HTMLDivElement | undefined;

  const toMessage = (arg: unknown): string => {
    if (Cause.isCause(arg as any)) {
      return Cause.pretty(arg as any);
    }
    if (arg instanceof Error) {
      return arg.stack || `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === "object" && arg !== null) {
      try {
        return JSON.stringify(arg, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
      } catch {
        return "[Circular Reference]";
      }
    }
    return String(arg);
  };

  const addLog = (type: LogEntry["type"], ...args: any[]) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
    const message = args.map(toMessage).join(" ");
    
    setLogStore("entries", (entries) => {
      const newEntry: LogEntry = {
        id: logStore.nextId,
        timestamp,
        type,
        message
      };
      // Keep only last 50 entries
      return entries.length >= 50 
        ? [...entries.slice(1), newEntry]
        : [...entries, newEntry];
    });
    setLogStore("nextId", (id) => id + 1);
  };

  // Setup console interception
  onMount(() => {
    const originalMethods = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error
    };

    console.log = (...args) => {
      originalMethods.log.apply(console, args);
      addLog("LOG", ...args);
    };

    console.info = (...args) => {
      originalMethods.info.apply(console, args);
      addLog("INFO", ...args);
    };

    console.warn = (...args) => {
      originalMethods.warn.apply(console, args);
      addLog("WARN", ...args);
    };

    console.error = (...args) => {
      originalMethods.error.apply(console, args);
      addLog("ERROR", ...args);
    };

    // Cleanup
    onCleanup(() => {
      Object.assign(console, originalMethods);
    });
  });

  // Auto-scroll to bottom when new logs are added
  createEffect(() => {
    if (logCount() > 0 && consoleContentRef) {
      consoleContentRef.scrollTop = consoleContentRef.scrollHeight;
    }
  });

  const clearLogs = () => setLogStore("entries", []);
  const toggleOpen = () => setIsOpen(!isOpen());

  // Memoized log type colors
  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "ERROR": return "text-red-400";
      case "WARN": return "text-yellow-400";
      case "INFO": return "text-blue-400";
      default: return "text-green-400";
    }
  };

  return (
    <div class="fixed top-4 right-4 w-96 bg-black rounded-lg shadow-xl font-mono text-xs z-50">
      <div class="bg-gray-800 px-3 py-2 rounded-t-lg flex justify-between items-center">
        <span class="font-bold text-white">
          Console Output
          <Show when={logCount() > 0}>
            <span class="text-gray-400 ml-2">({logCount()})</span>
          </Show>
        </span>
        <div class="flex items-center gap-2">
          <button
            onClick={toggleOpen}
            class="text-gray-400 hover:text-white transition-colors px-2 py-1"
            title={isOpen() ? "Collapse" : "Expand"}
          >
            {isOpen() ? "▼" : "▶"}
          </button>
          <Show when={logCount() > 0}>
            <button
              onClick={clearLogs}
              class="text-gray-400 hover:text-white transition-colors px-2 py-1"
              title="Clear logs"
            >
              ✕
            </button>
          </Show>
        </div>
      </div>
      
      <Show when={isOpen()}>
        <div 
          ref={consoleContentRef}
          class="p-3 max-h-64 overflow-y-auto space-y-1 bg-gray-900"
        >
          <Show
            when={logCount() > 0}
            fallback={
              <div class="text-gray-500 text-center py-4">
                Waiting for console output...
              </div>
            }
          >
            <For each={logStore.entries}>
              {(log) => (
                <div class="flex gap-2 group hover:bg-gray-800 px-1 rounded">
                  <span class="text-gray-600 flex-shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span class={`flex-shrink-0 ${getLogColor(log.type)}`}>
                    {log.type}:
                  </span>
                  <span class="whitespace-pre-wrap break-all text-gray-300">
                    {log.message}
                  </span>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
