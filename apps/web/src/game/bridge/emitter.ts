// oxlint-disable-next-line typescript/no-explicit-any -- listener arg lists vary per event
type Listener = (...args: any[]) => void;

export interface TypedEmitter<E extends { [K in keyof E]: Listener }> {
  on<K extends keyof E>(k: K, fn: E[K]): () => void;
  emit<K extends keyof E>(k: K, ...args: Parameters<E[K]>): void;
  listenerCount(k?: keyof E): number;
  clear(): void;
}

export function createEmitter<E extends { [K in keyof E]: Listener }>(): TypedEmitter<E> {
  const listeners = new Map<keyof E, Set<Listener>>();
  return {
    on(k, fn) {
      const set = listeners.get(k) ?? new Set();
      listeners.set(k, set);
      set.add(fn);
      return () => void set.delete(fn);
    },
    emit(k, ...args) {
      // Copy so a listener unsubscribing mid-emit does not skip the next one.
      for (const fn of Array.from(listeners.get(k) ?? [])) {
        try {
          fn(...args);
        } catch (err) {
          // One failing listener must not starve the rest; surface the error asynchronously.
          queueMicrotask(() => {
            throw err;
          });
        }
      }
    },
    listenerCount(k) {
      if (k !== undefined) return listeners.get(k)?.size ?? 0;
      let n = 0;
      for (const set of listeners.values()) n += set.size;
      return n;
    },
    clear: () => listeners.clear(),
  };
}
