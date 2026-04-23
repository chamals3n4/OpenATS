import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Assessments - Service/Validation Tests", () => {
  it("should validate text answer payload", () => {
    const textAnswerSchema = z.object({
      questionId: z.number().int().positive(),
      answerText: z.string().trim().min(1),
    });

    const valid = { questionId: 1, answerText: "My answer" };
    const invalidEmpty = { questionId: 1, answerText: "   " };
    const invalidQuestionId = { questionId: -5, answerText: "Ok" };

    expect(textAnswerSchema.safeParse(valid).success).toBe(true);
    expect(textAnswerSchema.safeParse(invalidEmpty).success).toBe(false);
    expect(textAnswerSchema.safeParse(invalidQuestionId).success).toBe(false);
  });

  it("should validate multiple-choice answer payload", () => {
    const multipleChoiceSchema = z.object({
      questionId: z.number().int().positive(),
      optionId: z.number().int().positive(),
    });

    const valid = { questionId: 2, optionId: 5 };
    const invalid = { questionId: 2, optionId: 0 };

    expect(multipleChoiceSchema.safeParse(valid).success).toBe(true);
    expect(multipleChoiceSchema.safeParse(invalid).success).toBe(false);
  });

  it("should validate checkbox (multi-select) answer payload", () => {
    const checkboxAnswerSchema = z.object({
      questionId: z.number().int().positive(),
      selectedOptions: z.array(z.number().int().positive()),
    });

    const valid = { questionId: 3, selectedOptions: [1, 2, 4] };
    const invalid = { questionId: 3, selectedOptions: [0, 2] };

    expect(checkboxAnswerSchema.safeParse(valid).success).toBe(true);
    expect(checkboxAnswerSchema.safeParse(invalid).success).toBe(false);
  });

  it("should validate CV analysis output payload", () => {
    const cvAnalysisSchema = z.object({
      status: z.enum(["pending", "done", "failed"]),
      matchScore: z.number().min(0).max(100),
      skills: z.array(z.string()).nullable(),
    });

    const valid = {
      status: "pending",
      matchScore: 87,
      skills: ["JavaScript", "React"],
    };

    const validNullSkills = { ...valid, skills: null };
    const invalidStatus = { ...valid, status: "processing" };
    const invalidScore = { ...valid, matchScore: 101 };

    expect(cvAnalysisSchema.safeParse(valid).success).toBe(true);
    expect(cvAnalysisSchema.safeParse(validNullSkills).success).toBe(true);
    expect(cvAnalysisSchema.safeParse(invalidStatus).success).toBe(false);
    expect(cvAnalysisSchema.safeParse(invalidScore).success).toBe(false);
  });

  it("should validate extracted resume text length", () => {
    const extractedTextSchema = z.string().max(50000);

    const small = "John Doe\nSkills: JS, React";
    const tooLarge = "a".repeat(50001);

    expect(extractedTextSchema.safeParse(small).success).toBe(true);
    expect(extractedTextSchema.safeParse(tooLarge).success).toBe(false);
  });
});
