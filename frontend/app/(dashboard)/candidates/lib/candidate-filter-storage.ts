/**
 * The Candidates filters, kept in the browser so they survive leaving the page and coming back,
 * not only a reload. It holds the same text as the address query, and nothing when no filter is on.
 */
const KEY = "openats.candidates.filters";

const listeners = new Set<() => void>();

export function readStoredFilters(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    // Storage can be blocked (private windows, site settings). The filters then last until reload.
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
