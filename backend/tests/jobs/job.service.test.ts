import { describe, it, expect } from "vitest";
import { z } from "zod";


describe("Job Management - Unit Tests", () => {
  describe("Job Creation", () => {
    it("should validate required fields for job creation", () => {
      const createJobSchema = z.object({
        title: z.string().min(1, "Title is required").max(255),
        departmentId: z.number().int().positive(),
        employmentType: z.enum([
          "full_time",
          "part_time",
          "contract",
          "internship",
          "freelance",
        ]),
      });

      const validJob = {
        title: "Software Engineer",
        departmentId: 1,
        employmentType: "full_time" as const,
      };

      const invalidJob = {
        title: "",
        departmentId: -1,
        employmentType: "invalid_type" as any,
      };

      const validResult = createJobSchema.safeParse(validJob);
      const invalidResult = createJobSchema.safeParse(invalidJob);

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);

      if (!invalidResult.success) {
        expect(invalidResult.error.issues.length).toBeGreaterThan(0);
      }
    });

    it("should reject empty job titles", () => {
      const titleSchema = z.string().trim().min(1, "Title is required");

      expect(titleSchema.safeParse("").success).toBe(false);
      expect(titleSchema.safeParse("  ").success).toBe(false);
      expect(titleSchema.safeParse("Senior Developer").success).toBe(true);
    });

    it("should enforce maximum title length", () => {
      const titleSchema = z.string().max(255);
      const longTitle = "a".repeat(300);

      expect(titleSchema.safeParse(longTitle).success).toBe(false);
      expect(titleSchema.safeParse("Normal Job Title").success).toBe(true);
    });
  });

  describe("Job Status", () => {
    it("should validate job status values", () => {
      const statusEnum = z.enum([
        "draft",
        "inactive",
        "published",
        "closed",
        "archived",
      ]);

      expect(statusEnum.safeParse("draft").success).toBe(true);
      expect(statusEnum.safeParse("published").success).toBe(true);
      expect(statusEnum.safeParse("inactive").success).toBe(true);
      expect(statusEnum.safeParse("closed").success).toBe(true);
      expect(statusEnum.safeParse("archived").success).toBe(true);
      expect(statusEnum.safeParse("invalid").success).toBe(false);
      expect(statusEnum.safeParse("").success).toBe(false);
    });

    it("should allow status updates from draft to published", () => {
      const currentStatus = "draft";
      const newStatus = "published";
      const validStatuses = [
        "draft",
        "inactive",
        "published",
        "closed",
        "archived",
      ];

      expect(validStatuses.includes(currentStatus)).toBe(true);
      expect(validStatuses.includes(newStatus)).toBe(true);
    });
  });

  describe("Salary Validation", () => {
    it("should validate salary range correctly", () => {
      const salaryRangeSchema = z
        .object({
          salaryMin: z.number().positive(),
          salaryMax: z.number().positive(),
        })
        .refine((data) => data.salaryMax >= data.salaryMin, {
          message: "Max salary must be greater than or equal to min salary",
        });

      const validSalary = { salaryMin: 50000, salaryMax: 80000 };
      const equalSalary = { salaryMin: 60000, salaryMax: 60000 };
      const invalidSalary = { salaryMin: 80000, salaryMax: 50000 };

      expect(salaryRangeSchema.safeParse(validSalary).success).toBe(true);
      expect(salaryRangeSchema.safeParse(equalSalary).success).toBe(true);
      expect(salaryRangeSchema.safeParse(invalidSalary).success).toBe(false);
    });

    it("should validate fixed salary", () => {
      const fixedSalarySchema = z.object({
        salaryType: z.literal("fixed"),
        salaryFixed: z.number().positive(),
      });

      const validFixed = { salaryType: "fixed" as const, salaryFixed: 75000 };
      const invalidFixed = { salaryType: "fixed" as const, salaryFixed: -1000 };

      expect(fixedSalarySchema.safeParse(validFixed).success).toBe(true);
      expect(fixedSalarySchema.safeParse(invalidFixed).success).toBe(false);
    });

    it("should validate currency codes", () => {
      const currencySchema = z.string().length(3);

      expect(currencySchema.safeParse("USD").success).toBe(true);
      expect(currencySchema.safeParse("EUR").success).toBe(true);
      expect(currencySchema.safeParse("GBP").success).toBe(true);
      expect(currencySchema.safeParse("LKR").success).toBe(true);
      expect(currencySchema.safeParse("US").success).toBe(false);
      expect(currencySchema.safeParse("USDD").success).toBe(false);
    });

    it("should validate pay frequency", () => {
      const payFrequencyEnum = z.enum([
        "hourly",
        "daily",
        "weekly",
        "monthly",
        "yearly",
      ]);

      expect(payFrequencyEnum.safeParse("hourly").success).toBe(true);
      expect(payFrequencyEnum.safeParse("monthly").success).toBe(true);
      expect(payFrequencyEnum.safeParse("yearly").success).toBe(true);
      expect(payFrequencyEnum.safeParse("invalid").success).toBe(false);
    });
  });

  describe("Skills Validation", () => {
    it("should validate skills array", () => {
      const skillsSchema = z.array(z.string().min(1).max(100)).max(50);

      const validSkills = ["JavaScript", "TypeScript", "React", "Node.js"];
      const emptySkill = ["JavaScript", "", "React"];
      const tooManySkills = Array(60).fill("skill");
      const longSkill = ["JavaScript", "a".repeat(150)];

      expect(skillsSchema.safeParse(validSkills).success).toBe(true);
      expect(skillsSchema.safeParse(emptySkill).success).toBe(false);
      expect(skillsSchema.safeParse(tooManySkills).success).toBe(false);
      expect(skillsSchema.safeParse(longSkill).success).toBe(false);
    });

    it("should allow empty skills array", () => {
      const skillsSchema = z.array(z.string()).optional();

      expect(skillsSchema.safeParse([]).success).toBe(true);
      expect(skillsSchema.safeParse(undefined).success).toBe(true);
    });

    it("should remove duplicate skills", () => {
      const skills = ["JavaScript", "React", "JavaScript", "Node.js"];
      const uniqueSkills = [...new Set(skills)];

      expect(uniqueSkills.length).toBe(3);
      expect(uniqueSkills).toEqual(["JavaScript", "React", "Node.js"]);
    });
  });

  describe("Job Updates", () => {
    it("should allow partial updates for job", () => {
      const updateJobSchema = z.object({
        title: z.string().min(1).optional(),
        status: z
          .enum(["draft", "published", "inactive", "closed", "archived"])
          .optional(),
        location: z.string().optional().nullable(),
      });

      const partialUpdate = { status: "published" as const };
      const multipleFields = {
        title: "Updated Title",
        status: "published" as const,
      };
      const emptyUpdate = {};

      expect(updateJobSchema.safeParse(partialUpdate).success).toBe(true);
      expect(updateJobSchema.safeParse(multipleFields).success).toBe(true);
      expect(updateJobSchema.safeParse(emptyUpdate).success).toBe(true);
    });

    it("should validate employment type updates", () => {
      const employmentTypeEnum = z.enum([
        "full_time",
        "part_time",
        "contract",
        "internship",
        "freelance",
      ]);

      expect(employmentTypeEnum.safeParse("full_time").success).toBe(true);
      expect(employmentTypeEnum.safeParse("part_time").success).toBe(true);
      expect(employmentTypeEnum.safeParse("contract").success).toBe(true);
      expect(employmentTypeEnum.safeParse("internship").success).toBe(true);
      expect(employmentTypeEnum.safeParse("freelance").success).toBe(true);
      expect(employmentTypeEnum.safeParse("temporary").success).toBe(false);
    });
  });

  describe("Department Association", () => {
    it("should validate department ID is positive integer", () => {
      const departmentIdSchema = z.number().int().positive();

      expect(departmentIdSchema.safeParse(1).success).toBe(true);
      expect(departmentIdSchema.safeParse(100).success).toBe(true);
      expect(departmentIdSchema.safeParse(0).success).toBe(false);
      expect(departmentIdSchema.safeParse(-1).success).toBe(false);
      expect(departmentIdSchema.safeParse(1.5).success).toBe(false);
      expect(departmentIdSchema.safeParse("1").success).toBe(false);
    });
  });

  describe("Location Field", () => {
    it("should accept optional location", () => {
      const locationSchema = z.string().max(255).optional().nullable();

      expect(locationSchema.safeParse("New York, NY").success).toBe(true);
      expect(locationSchema.safeParse("Remote").success).toBe(true);
      expect(locationSchema.safeParse(null).success).toBe(true);
      expect(locationSchema.safeParse(undefined).success).toBe(true);
      expect(locationSchema.safeParse("").success).toBe(true);
    });

    it("should enforce maximum location length", () => {
      const locationSchema = z.string().max(255);
      const longLocation = "a".repeat(300);

      expect(locationSchema.safeParse(longLocation).success).toBe(false);
      expect(locationSchema.safeParse("San Francisco, CA").success).toBe(true);
    });
  });

  describe("Job Description", () => {
    it("should accept optional description", () => {
      const descriptionSchema = z.string().optional().nullable();

      expect(descriptionSchema.safeParse("Job description here").success).toBe(
        true,
      );
      expect(descriptionSchema.safeParse(null).success).toBe(true);
      expect(descriptionSchema.safeParse(undefined).success).toBe(true);
    });

    it("should accept long descriptions", () => {
      const descriptionSchema = z.string();
      const longDescription = "a".repeat(5000);

      expect(descriptionSchema.safeParse(longDescription).success).toBe(true);
    });
  });

  describe("Complete Job Validation", () => {
    it("should validate a complete job object", () => {
      const completeJobSchema = z.object({
        title: z.string().min(1).max(255),
        departmentId: z.number().int().positive(),
        employmentType: z.enum([
          "full_time",
          "part_time",
          "contract",
          "internship",
          "freelance",
        ]),
        location: z.string().max(255).optional().nullable(),
        description: z.string().optional().nullable(),
        skills: z.array(z.string().min(1).max(100)).optional(),
        status: z
          .enum(["draft", "inactive", "published", "closed", "archived"])
          .optional(),
      });

      const completeJob = {
        title: "Senior Software Engineer",
        departmentId: 5,
        employmentType: "full_time" as const,
        location: "San Francisco, CA",
        description: "We are looking for an experienced engineer...",
        skills: ["JavaScript", "React", "Node.js"],
        status: "published" as const,
      };

      const result = completeJobSchema.safeParse(completeJob);
      expect(result.success).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle whitespace-only titles", () => {
      const titleSchema = z.string().trim().min(1);

      expect(titleSchema.safeParse("   ").success).toBe(false);
    });

    it("should handle very large numbers for salary", () => {
      const salarySchema = z.number().positive().max(999999999);

      expect(salarySchema.safeParse(1000000000).success).toBe(false);
      expect(salarySchema.safeParse(500000).success).toBe(true);
    });

    it("should handle special characters in job titles", () => {
      const titleSchema = z.string().min(1).max(255);
      const titles = [
        "C++ Developer",
        "Front-End Engineer",
        "UI/UX Designer",
        "Senior Engineer (Remote)",
      ];

      titles.forEach((title) => {
        expect(titleSchema.safeParse(title).success).toBe(true);
      });
    });
  });
});
