import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("CV Parsing - Security/Rule Tests", () => {
  it("should validate resume file type and size", () => {
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB

    const valid = { mimetype: "application/pdf", size: 2 * 1024 * 1024 };
    const invalidMime = { mimetype: "application/exe", size: 2 * 1024 * 1024 };
    const invalidSize = { mimetype: "application/pdf", size: 10 * 1024 * 1024 };

    expect(allowedMimeTypes.includes(valid.mimetype)).toBe(true);
    expect(valid.size <= maxSizeInBytes).toBe(true);

    expect(allowedMimeTypes.includes(invalidMime.mimetype)).toBe(false);
    expect(invalidSize.size <= maxSizeInBytes).toBe(false);
  });

  it("should sanitize resume filenames (prevent traversal)", () => {
    const sanitizeFilename = (filename: string) => {
      const noSeparators = filename.replace(/[\/\\]/g, "_");
      const noDotDot = noSeparators.replace(/\.{2,}/g, "_");
      return noDotDot.replace(/[^a-zA-Z0-9._-]/g, "_");
    };

    const maliciousFilenames = [
      "../../../etc/passwd",
      "../../resume.pdf",
      "resume.pdf; rm -rf /",
      "resume<script>.pdf",
    ];

    maliciousFilenames.forEach((name) => {
      const sanitized = sanitizeFilename(name);
      expect(sanitized).not.toContain("..");
      expect(sanitized).not.toContain("/");
      expect(sanitized).not.toContain("\\");
      expect(sanitized).not.toContain("<");
      expect(sanitized).not.toContain(">");
    });
  });

  it("should validate parsed resume fields types", () => {
    const parsedResumeSchema = z.object({
      extractedText: z.string().trim().min(1).max(50000),
      skills: z.array(z.string().min(1).max(100)).max(50).optional(),
      // The parser might mark failures without throwing
      status: z.enum(["pending", "processing", "done", "failed"]),
    });

    const valid = {
      extractedText: "John Doe\nSkills: JavaScript, React",
      skills: ["JavaScript", "React"],
      status: "done",
    };

    const invalid = {
      extractedText: "   ",
      skills: [""],
      status: "unknown",
    };

    expect(parsedResumeSchema.safeParse(valid).success).toBe(true);
    expect(parsedResumeSchema.safeParse(invalid).success).toBe(false);
  });
});

