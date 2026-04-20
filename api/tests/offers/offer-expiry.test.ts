import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isPastOfferResponseDeadline } from "../../src/utils/offer-expiry";

describe("isPastOfferResponseDeadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for null/empty", () => {
    expect(isPastOfferResponseDeadline(null)).toBe(false);
    expect(isPastOfferResponseDeadline("")).toBe(false);
    expect(isPastOfferResponseDeadline(undefined)).toBe(false);
  });

  it("allows responses through the end of the expiry calendar day", () => {
    vi.setSystemTime(new Date("2025-06-01T18:30:00.000Z"));
    expect(isPastOfferResponseDeadline("2025-06-01")).toBe(false);
  });

  it("returns true the day after expiry", () => {
    vi.setSystemTime(new Date("2025-06-03T12:00:00.000Z"));
    expect(isPastOfferResponseDeadline("2025-06-01")).toBe(true);
  });
});
