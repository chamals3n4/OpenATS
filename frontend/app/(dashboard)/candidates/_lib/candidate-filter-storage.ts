/** Save filters in the browser */
const KEY = "openats.candidates.filters";

const listeners = new Set<() => void>();

export function readStoredFilters(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    // Storage can be blocked, so ignore errors
    return null;
  }
}

export function writeStoredFilters(query: string) {
  try {
    if (query) window.localStorage.setItem(KEY, query);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Not saving is fine; the address still holds them.
  }
  listeners.forEach((l) => l());
}

export function subscribeStoredFilters(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
