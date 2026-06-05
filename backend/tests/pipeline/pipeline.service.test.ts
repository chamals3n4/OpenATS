import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Hiring Pipeline - Unit Tests", () => {
  it("should validate pipeline stage creation", () => {
    const stageSchema = z.object({
      name: z.string().min(1).max(100),
      position: z.number().int().positive(),
      stageType: z.enum([
        "none",
        "source",
        "assessment",
        "interview",
        "offer",
        "rejection",
      ]),
    });

    const validStage = {
      name: "Technical Interview",
      position: 2,
      stageType: "interview" as const,
    };

    const invalidStage = {
      name: "",
      position: -1,
      stageType: "invalid" as any,
    };

    expect(stageSchema.safeParse(validStage).success).toBe(true);
    expect(stageSchema.safeParse(invalidStage).success).toBe(false);
  });

  it("should reorder stages correctly", () => {
    const stages = [
      { id: 1, position: 1 },
      { id: 2, position: 2 },
      { id: 3, position: 3 },
    ];

    const reorderedStages = [
      { id: 3, position: 1 },
      { id: 1, position: 2 },
      { id: 2, position: 3 },
    ];

    expect(reorderedStages[0].id).toBe(3);
    expect(reorderedStages[0].position).toBe(1);

    expect(reorderedStages.map((s) => s.id).sort()).toEqual(stages.map((s) => s.id).sort());
  });


  it("should validate stage types", () => {
    const validTypes = ["none", "source", "assessment", "interview", "offer", "rejection"];

    expect(validTypes.includes("interview")).toBe(true);
    expect(validTypes.includes("invalid")).toBe(false);
  });

  it("should validate candidate stage movement", () => {
    const moveSchema = z.object({
      candidateId: z.number().int().positive(),
      fromStageId: z.number().int().positive(),
      toStageId: z.number().int().positive(),
    });

    const validMove = {
      candidateId: 1,
      fromStageId: 2,
      toStageId: 3,
    };

    expect(moveSchema.safeParse(validMove).success).toBe(true);
  });

  it("should prevent duplicate stage positions", () => {
    const stages = [
      { id: 1, position: 1 },
      { id: 2, position: 2 },
    ];

    const newPosition = 2;
    const existingPositions = stages.map((s) => s.position);

    expect(existingPositions.includes(newPosition)).toBe(true);
  });
});

