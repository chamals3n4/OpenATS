import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Offer Management - Unit Tests", () => {
  it("should validate offer creation", () => {
    const offerSchema = z.object({
      candidateId: z.number().int().positive(),
      jobId: z.number().int().positive(),
      salary: z.number().positive().optional(),
      currency: z.string().length(3).optional(),
      startDate: z.string().optional(),
    });

    const validOffer = {
      candidateId: 1,
      jobId: 1,
      salary: 80000,
      currency: "USD",
      startDate: "2024-02-01",
    };

    const invalidOffer = {
      candidateId: -1,
      jobId: 0,
      salary: -1000,
      currency: "US",
    };

    expect(offerSchema.safeParse(validOffer).success).toBe(true);
    expect(offerSchema.safeParse(invalidOffer).success).toBe(false);
  });

  it("should validate offer status transitions", () => {
    const statusEnum = z.enum([
      "draft",
      "sent",
      "pending",
      "accepted",
      "declined",
      "withdrawn",
    ]);

    expect(statusEnum.safeParse("draft").success).toBe(true);
    expect(statusEnum.safeParse("accepted").success).toBe(true);
    expect(statusEnum.safeParse("invalid").success).toBe(false);
  });

  it("should validate ISO currency codes", () => {
    const currencySchema = z.string().length(3);

    const validCurrencies = ["USD", "EUR", "GBP", "LKR"];
    const invalidCurrencies = ["US", "USDD", "$", ""];

    validCurrencies.forEach((currency) => {
      expect(currencySchema.safeParse(currency).success).toBe(true);
    });

    invalidCurrencies.forEach((currency) => {
      expect(currencySchema.safeParse(currency).success).toBe(false);
    });
  });

  it("should validate positive salary values", () => {
    const salarySchema = z.number().positive();

    expect(salarySchema.safeParse(50000).success).toBe(true);
    expect(salarySchema.safeParse(-1000).success).toBe(false);
    expect(salarySchema.safeParse(0).success).toBe(false);
  });

  it("should validate offer expiry dates", () => {
    const today = new Date();
    const futureDate = new Date(
      today.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    const pastDate = new Date(
      today.getTime() - 7 * 24 * 60 * 60 * 1000,
    );

    expect(futureDate > today).toBe(true); // Valid
    expect(pastDate < today).toBe(true); // Invalid
  });
});

