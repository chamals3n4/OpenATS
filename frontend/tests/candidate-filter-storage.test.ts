import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readStoredFilters,
  subscribeStoredFilters,
  writeStoredFilters,
} from "@/app/(dashboard)/candidates/lib/candidate-filter-storage";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("saved candidate filters", () => {
  it("saves and reads them back", () => {
    expect(readStoredFilters()).toBeNull();
    writeStoredFilters("job=3&minScore=70");
    expect(readStoredFilters()).toBe("job=3&minScore=70");
  });

  it("removes them when no filter is left, so the list is unfiltered again", () => {
    writeStoredFilters("job=3");
    writeStoredFilters("");
    expect(readStoredFilters()).toBeNull();
  });

  it("tells subscribers when they change, and stops once they unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeStoredFilters(listener);
    writeStoredFilters("job=3");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    writeStoredFilters("job=4");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("carries on without saving when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readStoredFilters()).toBeNull();
    expect(() => writeStoredFilters("job=3")).not.toThrow();
  });
});
