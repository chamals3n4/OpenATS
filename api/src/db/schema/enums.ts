import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "super_admin",
  "hiring_manager",
  "interviewer",
]);

export const employmentType = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "freelance",
]);

export const salaryType = pgEnum("salary_type", ["range", "fixed"]);

export const payFrequency = pgEnum("pay_frequency", [
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const jobStatus = pgEnum("job_status", [
  "draft",
  "inactive",
  "published",
  "closed",
  "archived",
]);

export const stageType = pgEnum("stage_type", ["none", "offer", "rejection"]);

export const offerMode = pgEnum("offer_mode", ["auto_draft", "auto_send"]);

export const offerStatus = pgEnum("offer_status", [
  "draft",
  "sent",
  "pending",
  "accepted",
  "declined",
  "withdrawn",
]);

export const questionType = pgEnum("question_type", [
  "short_answer",
  "long_answer",
  "checkbox",
  "radio",
  "multiple_choice",
]);

export const templateType = pgEnum("template_type", [
  "offer",
  "rejection",
  "assessment_invite",
  "general",
]);

export const assessmentStatus = pgEnum("assessment_status", [
  "pending",
  "started",
  "completed",
  "expired",
]);

export const cvAnalysisStatus = pgEnum("cv_analysis_status", [
  "pending",
  "done",
  "failed",
]);
