import { pgEnum } from "drizzle-orm/pg-core";

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

export const stageType = pgEnum("stage_type", [
  "screening",
  "interview",
  "offer",
]);

export const offerMode = pgEnum("offer_mode", ["auto_draft", "auto_send"]);

export const offerStatus = pgEnum("offer_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
]);

export const candidateActivityType = pgEnum("candidate_activity_type", [
  "offer_created",
  "offer_updated",
  "offer_sent",
  "offer_viewed",
  "offer_accepted",
  "offer_declined",
  "candidate_hired",
]);

export const rejectionEmailStatus = pgEnum("rejection_email_status", [
  "not_sent",
  "draft",
  "sent",
]);

export const interviewOutcome = pgEnum("interview_outcome", [
  "pending",
  "pass",
  "fail",
]);

export const candidateStatus = pgEnum("candidate_status", [
  "active",
  "rejected",
  "offered",
  "hired",
  "withdrawn",
]);

export const questionType = pgEnum("question_type", [
  "short_answer",
  "long_answer",
  "checkbox",
  "radio",
  "multiple_choice",
]);

export const templateType = pgEnum("template_type", ["email", "event"]);

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
