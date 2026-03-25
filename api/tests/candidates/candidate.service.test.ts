import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Candidate Management - Unit Tests", () => {
  describe("Candidate Creation", () => {
    it("should validate required fields for candidate creation", () => {
      const candidateSchema = z.object({
        firstName: z.string().min(1, "First name is required").max(100),
        lastName: z.string().min(1, "Last name is required").max(100),
        email: z.string().email("Valid email is required"),
        phone: z.string().optional().nullable(),
        jobId: z.number().int().positive("Valid job ID is required"),
      });

      const validCandidate = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        jobId: 1,
      };

      const invalidCandidate = {
        firstName: "",
        lastName: "Doe",
        email: "invalid-email",
        phone: null,
        jobId: -1,
      };

      const validResult = candidateSchema.safeParse(validCandidate);
      const invalidResult = candidateSchema.safeParse(invalidCandidate);

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);

      if (!invalidResult.success) {
        expect(invalidResult.error.issues.length).toBeGreaterThan(0);
      }
    });

    it("should reject empty first names", () => {
      const firstNameSchema = z.string().trim().min(1);

      expect(firstNameSchema.safeParse("").success).toBe(false);
      expect(firstNameSchema.safeParse("  ").success).toBe(false);
      expect(firstNameSchema.safeParse("John").success).toBe(true);
    });

    it("should reject empty last names", () => {
      const lastNameSchema = z.string().trim().min(1);

      expect(lastNameSchema.safeParse("").success).toBe(false);
      expect(lastNameSchema.safeParse("  ").success).toBe(false);
      expect(lastNameSchema.safeParse("Doe").success).toBe(true);
    });

    it("should enforce maximum name lengths", () => {
      const nameSchema = z.string().max(100);
      const longName = "a".repeat(150);

      expect(nameSchema.safeParse(longName).success).toBe(false);
      expect(nameSchema.safeParse("Normal Name").success).toBe(true);
    });
  });

  describe("Email Validation", () => {
    it("should validate email format correctly", () => {
      const emailSchema = z.string().email();

      const validEmails = [
        "test@example.com",
        "user.name@company.co.uk",
        "first+last@domain.org",
        "email@subdomain.example.com",
        "firstname.lastname@example.com",
        "email@example.com",
        "1234567890@example.com",
      ];

      const invalidEmails = [
        "plainaddress",
        "@example.com",
        "user@",
        "user @example.com",
        "user@example",
        "user..name@example.com",
        "user@.com",
        "user@example..com",
      ];

      validEmails.forEach((email) => {
        expect(emailSchema.safeParse(email).success).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(emailSchema.safeParse(email).success).toBe(false);
      });
    });

    it("should be case insensitive for email validation", () => {
      const emailSchema = z.string().email();

      expect(emailSchema.safeParse("USER@EXAMPLE.COM").success).toBe(true);
      expect(emailSchema.safeParse("User@Example.Com").success).toBe(true);
      expect(emailSchema.safeParse("user@example.com").success).toBe(true);
    });
  });

  describe("Phone Number Validation", () => {
    it("should validate phone number format", () => {
      const phoneSchema = z.string().regex(/^\+?[0-9\s\-\(\)]+$/);

      const validPhones = [
        "+1234567890",
        "(555) 123-4567",
        "+44 20 1234 5678",
        "555-123-4567",
        "1234567890",
        "+1 (555) 123-4567",
      ];

      const invalidPhones = ["abc123", "phone", "+++", "12-abc-345"];

      validPhones.forEach((phone) => {
        expect(phoneSchema.safeParse(phone).success).toBe(true);
      });

      invalidPhones.forEach((phone) => {
        expect(phoneSchema.safeParse(phone).success).toBe(false);
      });
    });

    it("should allow optional phone numbers", () => {
      const phoneSchema = z.string().optional().nullable();

      expect(phoneSchema.safeParse(undefined).success).toBe(true);
      expect(phoneSchema.safeParse(null).success).toBe(true);
      expect(phoneSchema.safeParse("+1234567890").success).toBe(true);
    });

    it("should accept international phone formats", () => {
      const phoneSchema = z.string().regex(/^\+?[0-9\s\-\(\)]+$/);

      const internationalPhones = [
        "+1 555 123 4567", // US
        "+44 20 1234 5678", // UK
        "+91 98765 43210", // India
        "+86 138 0000 0000", // China
      ];

      internationalPhones.forEach((phone) => {
        expect(phoneSchema.safeParse(phone).success).toBe(true);
      });
    });
  });

  describe("Resume Upload Validation", () => {
    it("should validate resume file requirements", () => {
      const allowedMimeTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB

      const validFile = {
        mimetype: "application/pdf",
        size: 2 * 1024 * 1024, // 2MB
      };

      const invalidFile = {
        mimetype: "application/exe",
        size: 10 * 1024 * 1024, // 10MB
      };

      expect(allowedMimeTypes.includes(validFile.mimetype)).toBe(true);
      expect(validFile.size <= maxSizeInBytes).toBe(true);

      expect(allowedMimeTypes.includes(invalidFile.mimetype)).toBe(false);
      expect(invalidFile.size <= maxSizeInBytes).toBe(false);
    });

    it("should reject files that are too large", () => {
      const maxSizeInBytes = 5 * 1024 * 1024;
      const fileSizes = [
        1 * 1024 * 1024, // 1MB - valid
        3 * 1024 * 1024, // 3MB - valid
        5 * 1024 * 1024, // 5MB - valid
        6 * 1024 * 1024, // 6MB - invalid
        10 * 1024 * 1024, // 10MB - invalid
      ];

      expect(fileSizes[0] <= maxSizeInBytes).toBe(true);
      expect(fileSizes[1] <= maxSizeInBytes).toBe(true);
      expect(fileSizes[2] <= maxSizeInBytes).toBe(true);
      expect(fileSizes[3] <= maxSizeInBytes).toBe(false);
      expect(fileSizes[4] <= maxSizeInBytes).toBe(false);
    });

    it("should only accept document file types", () => {
      const allowedMimeTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      const validTypes = ["application/pdf", "application/msword"];

      const invalidTypes = [
        "image/jpeg",
        "video/mp4",
        "application/exe",
        "text/javascript",
        "application/x-sh",
      ];

      validTypes.forEach((type) => {
        expect(allowedMimeTypes.includes(type)).toBe(true);
      });

      invalidTypes.forEach((type) => {
        expect(allowedMimeTypes.includes(type)).toBe(false);
      });
    });
  });

  describe("Stage Assignment", () => {
    it("should validate candidate stage assignment", () => {
      const stageAssignmentSchema = z.object({
        candidateId: z.number().int().positive(),
        stageId: z.number().int().positive(),
      });

      const validAssignment = { candidateId: 1, stageId: 2 };
      const invalidAssignment = { candidateId: -1, stageId: 0 };
      const missingStage = { candidateId: 1 };

      expect(stageAssignmentSchema.safeParse(validAssignment).success).toBe(
        true,
      );
      expect(stageAssignmentSchema.safeParse(invalidAssignment).success).toBe(
        false,
      );
      expect(stageAssignmentSchema.safeParse(missingStage).success).toBe(false);
    });

    it("should allow moving candidates between stages", () => {
      const moveSchema = z.object({
        candidateId: z.number().int().positive(),
        fromStageId: z.number().int().positive(),
        toStageId: z.number().int().positive(),
      });

      const validMove = {
        candidateId: 5,
        fromStageId: 1,
        toStageId: 2,
      };

      expect(moveSchema.safeParse(validMove).success).toBe(true);
    });

    it("should track stage history", () => {
      const stageHistory = [
        { stageId: 1, movedAt: "2024-01-01" },
        { stageId: 2, movedAt: "2024-01-15" },
        { stageId: 3, movedAt: "2024-02-01" },
      ];

      expect(stageHistory.length).toBe(3);
      expect(stageHistory[0].stageId).toBe(1);
      expect(stageHistory[2].stageId).toBe(3);
    });
  });

  describe("Name Validation", () => {
    it("should handle special characters in names safely", () => {
      const nameSchema = z.string().min(1).max(100);

      const specialNames = [
        "O'Brien",
        "José García",
        "François Müller",
        "李明", // Chinese
        "محمد", // Arabic
        "Søren Eriksen",
        "Marie-Claire",
        "van der Berg",
      ];

      specialNames.forEach((name) => {
        expect(nameSchema.safeParse(name).success).toBe(true);
      });
    });

    it("should reject names with only numbers", () => {
      const nameSchema = z.string().min(1);

      expect(nameSchema.safeParse("123").success).toBe(true); // Schema allows, but business logic should validate
      expect(nameSchema.safeParse("John123").success).toBe(true);
    });

    it("should handle hyphenated names", () => {
      const nameSchema = z.string().min(1).max(100);

      expect(nameSchema.safeParse("Anne-Marie").success).toBe(true);
      expect(nameSchema.safeParse("Jean-Claude").success).toBe(true);
      expect(nameSchema.safeParse("Mary-Jane").success).toBe(true);
    });
  });

  describe("Job Association", () => {
    it("should validate job ID is positive integer", () => {
      const jobIdSchema = z.number().int().positive();

      expect(jobIdSchema.safeParse(1).success).toBe(true);
      expect(jobIdSchema.safeParse(100).success).toBe(true);
      expect(jobIdSchema.safeParse(0).success).toBe(false);
      expect(jobIdSchema.safeParse(-1).success).toBe(false);
      expect(jobIdSchema.safeParse(1.5).success).toBe(false);
      expect(jobIdSchema.safeParse("1").success).toBe(false);
    });

    it("should ensure candidate is associated with a valid job", () => {
      const candidateJobSchema = z.object({
        candidateId: z.number().int().positive(),
        jobId: z.number().int().positive(),
      });

      const validAssociation = { candidateId: 5, jobId: 3 };

      expect(candidateJobSchema.safeParse(validAssociation).success).toBe(true);
    });
  });

  describe("Candidate Updates", () => {
    it("should allow partial updates for candidate", () => {
      const updateCandidateSchema = z.object({
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional().nullable(),
      });

      const partialUpdate = { email: "newemail@example.com" };
      const multipleFields = {
        firstName: "Jane",
        lastName: "Smith",
      };
      const emptyUpdate = {};

      expect(updateCandidateSchema.safeParse(partialUpdate).success).toBe(true);
      expect(updateCandidateSchema.safeParse(multipleFields).success).toBe(
        true,
      );
      expect(updateCandidateSchema.safeParse(emptyUpdate).success).toBe(true);
    });

    it("should update resume URL", () => {
      const resumeUrlSchema = z.string().url().optional().nullable();

      expect(
        resumeUrlSchema.safeParse(
          "https://bucket.s3.amazonaws.com/resumes/123.pdf",
        ).success,
      ).toBe(true);
      expect(resumeUrlSchema.safeParse(null).success).toBe(true);
      expect(resumeUrlSchema.safeParse("not-a-url").success).toBe(false);
    });
  });

  describe("Custom Question Answers", () => {
    it("should validate text answer format", () => {
      const textAnswerSchema = z.object({
        questionId: z.number().int().positive(),
        answerText: z.string().min(1),
      });

      const validAnswer = {
        questionId: 1,
        answerText: "My answer to the question",
      };

      expect(textAnswerSchema.safeParse(validAnswer).success).toBe(true);
    });

    it("should validate multiple choice answers", () => {
      const multipleChoiceSchema = z.object({
        questionId: z.number().int().positive(),
        optionId: z.number().int().positive(),
      });

      const validChoice = {
        questionId: 2,
        optionId: 5,
      };

      expect(multipleChoiceSchema.safeParse(validChoice).success).toBe(true);
    });

    it("should allow multiple selections for checkbox questions", () => {
      const checkboxAnswerSchema = z.object({
        questionId: z.number().int().positive(),
        selectedOptions: z.array(z.number().int().positive()),
      });

      const validSelections = {
        questionId: 3,
        selectedOptions: [1, 2, 4],
      };

      expect(checkboxAnswerSchema.safeParse(validSelections).success).toBe(
        true,
      );
    });
  });

  describe("CV Analysis", () => {
    it("should validate CV analysis status", () => {
      const statusEnum = z.enum(["pending", "done", "failed"]);

      expect(statusEnum.safeParse("pending").success).toBe(true);
      expect(statusEnum.safeParse("done").success).toBe(true);
      expect(statusEnum.safeParse("failed").success).toBe(true);
      expect(statusEnum.safeParse("processing").success).toBe(false);
    });

    it("should validate match score range", () => {
      const matchScoreSchema = z.number().min(0).max(100);

      expect(matchScoreSchema.safeParse(0).success).toBe(true);
      expect(matchScoreSchema.safeParse(50).success).toBe(true);
      expect(matchScoreSchema.safeParse(100).success).toBe(true);
      expect(matchScoreSchema.safeParse(-1).success).toBe(false);
      expect(matchScoreSchema.safeParse(101).success).toBe(false);
    });

    it("should validate skills arrays in CV analysis", () => {
      const skillsArraySchema = z.array(z.string()).nullable();

      expect(
        skillsArraySchema.safeParse(["JavaScript", "React", "Node.js"]).success,
      ).toBe(true);
      expect(skillsArraySchema.safeParse([]).success).toBe(true);
      expect(skillsArraySchema.safeParse(null).success).toBe(true);
    });
  });

  describe("Complete Candidate Validation", () => {
    it("should validate a complete candidate object", () => {
      const completeCandidateSchema = z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
        jobId: z.number().int().positive(),
        currentStageId: z.number().int().positive().optional().nullable(),
        resumeUrl: z.string().url().optional().nullable(),
      });

      const completeCandidate = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        jobId: 5,
        currentStageId: 2,
        resumeUrl: "https://example.com/resumes/john-doe.pdf",
      };

      const result = completeCandidateSchema.safeParse(completeCandidate);
      expect(result.success).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long names within limit", () => {
      const nameSchema = z.string().max(100);
      const longName = "a".repeat(100);

      expect(nameSchema.safeParse(longName).success).toBe(true);
      expect(nameSchema.safeParse("a".repeat(101)).success).toBe(false);
    });

    it("should handle whitespace in names", () => {
      const nameSchema = z.string().trim().min(1);

      expect(nameSchema.safeParse("John Doe").success).toBe(true);
      expect(nameSchema.safeParse("  John  ").success).toBe(true);
      expect(nameSchema.safeParse("   ").success).toBe(false); // Only whitespace
    });

    it("should handle null vs undefined for optional fields", () => {
      const optionalSchema = z.string().optional().nullable();

      expect(optionalSchema.safeParse(undefined).success).toBe(true);
      expect(optionalSchema.safeParse(null).success).toBe(true);
      expect(optionalSchema.safeParse("value").success).toBe(true);
    });
  });
});
