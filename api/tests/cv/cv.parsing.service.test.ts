import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("CV Parsing - Service/Validation Tests", () => {
  it("should validate CV parsing request payload", () => {
    const parseRequestSchema = z.object({
      candidateId: z.number().int().positive(),
      jobId: z.number().int().positive(),
      resumeUrl: z.string().url(),
    });

    const valid = {
      candidateId: 1,
      jobId: 2,
      resumeUrl: "https://bucket.s3.amazonaws.com/resumes/1.pdf",
    };

    const invalid = {
      candidateId: -1,
      jobId: 0,
      resumeUrl: "not-a-url",
    };

    expect(parseRequestSchema.safeParse(valid).success).toBe(true);
    expect(parseRequestSchema.safeParse(invalid).success).toBe(false);
  });

  it("should validate extracted resume text constraints", () => {
    const extractedTextSchema = z.string().trim().min(1).max(50000);

    expect(extractedTextSchema.safeParse("John Doe").success).toBe(true);
    expect(extractedTextSchema.safeParse("   John   ").success).toBe(true);
    expect(extractedTextSchema.safeParse("   ").success).toBe(false);
    expect(extractedTextSchema.safeParse("a".repeat(50001)).success).toBe(false);
  });

  it("should validate parsed skills output", () => {
    const skillsSchema = z.array(z.string().min(1).max(100)).max(50);

    expect(skillsSchema.safeParse(["JavaScript", "React"]).success).toBe(true);
    expect(skillsSchema.safeParse([""]).success).toBe(false);
    expect(skillsSchema.safeParse(Array(60).fill("skill")).success).toBe(false);
  });

  it("should validate parsing status values", () => {
    const statusEnum = z.enum(["pending", "processing", "done", "failed"]);

    expect(statusEnum.safeParse("pending").success).toBe(true);
    expect(statusEnum.safeParse("processing").success).toBe(true);
    expect(statusEnum.safeParse("done").success).toBe(true);
    expect(statusEnum.safeParse("failed").success).toBe(true);
    expect(statusEnum.safeParse("unknown").success).toBe(false);
  });
});

