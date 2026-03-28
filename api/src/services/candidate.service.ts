import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  candidates,
  candidateCvAnalysis,
  candidateStageHistory,
  candidateCustomAnswers,
  candidateCustomAnswerSelections,
  jobPipelineStages,
  jobCustomQuestions,
  jobCustomQuestionOptions,
  jobAssessmentAttachments,
  jobs,
  offers,
  templates,
} from "../db/schema";
import type { Candidate } from "../db/schema/candidates";
import { assessmentExecutionService } from "./assessment-execution.service";
import { offerService } from "./offer.service";
import { jobService } from "./job.service";
import { socketService } from "./socket.service";
import { mailService } from "./mail.service";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";
import { cleanObject as clean } from "../utils/object.utils";

/** Drizzle wraps driver errors; Postgres code 23505 is often on `cause`. */
function isPgUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 12 && current && typeof current === "object"; depth++) {
    if (seen.has(current)) break;
    seen.add(current);
    const code = (current as { code?: string }).code;
    if (code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export class DuplicateApplicationError extends Error {
  constructor() {
    super("DUPLICATE_APPLICATION");
    this.name = "DuplicateApplicationError";
  }
}

export interface CustomAnswerInput {
  questionId: number;
  answerText?: string | null | undefined;
  optionIds?: number[] | undefined;
}

export interface CandidateApplyInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null | undefined;
  resumeUrl?: string | null | undefined;
  customAnswers?: CustomAnswerInput[] | undefined;
}

export interface CandidateFilters {
  stageId?: number | undefined;
  search?: string | undefined;
}

export interface CandidateBasicUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  resumeUrl?: string | null;
}

/** Returned with move-stage so the UI can toast automation outcomes. */
export type StageAutomationFlags = {
  assessmentInvite?: "sent" | "skipped_active_invite";
  offer?: "created" | "skipped_open_exists";
  rejectionEmail?: "sent" | "skipped_already_sent";
};

export type MoveStageResult = {
  candidate: Candidate;
  stageAutomation: StageAutomationFlags;
};

export const candidateService = {
  async apply(jobId: number, input: CandidateApplyInput) {
    const { customAnswers, ...rest } = input;
    const normalizedEmail = rest.email.trim().toLowerCase();
    const candidateData = { ...rest, email: normalizedEmail };

    try {
      return await db.transaction(async (tx) => {
      const [firstStage] = await tx
        .select()
        .from(jobPipelineStages)
        .where(eq(jobPipelineStages.jobId, jobId))
        .orderBy(asc(jobPipelineStages.position))
        .limit(1);

      if (!firstStage) {
        throw new Error("No pipeline stages defined for this job");
      }

      const [candidate] = await tx
        .insert(candidates)
        .values(
          clean({
            ...candidateData,
            jobId,
            currentStageId: firstStage.id,
          }),
        )
        .returning();

      if (!candidate) {
        throw new Error("Failed to create candidate");
      }

      await tx.insert(candidateStageHistory).values({
        candidateId: candidate.id,
        stageId: firstStage.id,
      });

      if (customAnswers && customAnswers.length > 0) {
        for (const answer of customAnswers) {
          const [question] = await tx
            .select()
            .from(jobCustomQuestions)
            .where(
              and(
                eq(jobCustomQuestions.id, answer.questionId),
                eq(jobCustomQuestions.jobId, jobId),
              ),
            );

          if (!question) continue;

          if (answer.answerText !== undefined) {
            await tx.insert(candidateCustomAnswers).values({
              candidateId: candidate.id,
              questionId: answer.questionId,
              answerText: answer.answerText,
            });
          }

          if (answer.optionIds && answer.optionIds.length > 0) {
            await tx.insert(candidateCustomAnswerSelections).values(
              answer.optionIds.map((optionId) => ({
                candidateId: candidate.id,
                questionId: answer.questionId,
                optionId,
              })),
            );
          }
        }
      }

      return candidate;
    });
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new DuplicateApplicationError();
      }
      throw err;
    }
  },

  async getAll(jobId: number | undefined, filters: CandidateFilters = {}) {
    const conditions = [];

    if (jobId) {
      conditions.push(eq(candidates.jobId, jobId));
    }

    if (filters.stageId) {
      conditions.push(eq(candidates.currentStageId, filters.stageId));
    }

    return db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        phone: candidates.phone,
        resumeUrl: candidates.resumeUrl,
        jobId: candidates.jobId,
        currentStageId: candidates.currentStageId,
        appliedAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
        stageName: jobPipelineStages.name,
        jobTitle: jobs.title,
      })
      .from(candidates)
      .leftJoin(
        jobPipelineStages,
        eq(candidates.currentStageId, jobPipelineStages.id),
      )
      .leftJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(candidates.appliedAt));
  },

  async getById(id: number) {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));

    if (!candidate) return null;

    const answers = await db
      .select({
        id: candidateCustomAnswers.id,
        candidateId: candidateCustomAnswers.candidateId,
        questionId: candidateCustomAnswers.questionId,
        answerText: candidateCustomAnswers.answerText,
        createdAt: candidateCustomAnswers.createdAt,
        questionTitle: jobCustomQuestions.title,
      })
      .from(candidateCustomAnswers)
      .leftJoin(
        jobCustomQuestions,
        eq(candidateCustomAnswers.questionId, jobCustomQuestions.id),
      )
      .where(eq(candidateCustomAnswers.candidateId, id));

    const selections = await db
      .select({
        id: candidateCustomAnswerSelections.id,
        candidateId: candidateCustomAnswerSelections.candidateId,
        questionId: candidateCustomAnswerSelections.questionId,
        optionId: candidateCustomAnswerSelections.optionId,
        createdAt: candidateCustomAnswerSelections.createdAt,
        questionTitle: jobCustomQuestions.title,
        optionLabel: jobCustomQuestionOptions.label,
      })
      .from(candidateCustomAnswerSelections)
      .leftJoin(
        jobCustomQuestions,
        eq(candidateCustomAnswerSelections.questionId, jobCustomQuestions.id),
      )
      .leftJoin(
        jobCustomQuestionOptions,
        eq(
          candidateCustomAnswerSelections.optionId,
          jobCustomQuestionOptions.id,
        ),
      )
      .where(eq(candidateCustomAnswerSelections.candidateId, id));

    const history = await db
      .select()
      .from(candidateStageHistory)
      .where(eq(candidateStageHistory.candidateId, id))
      .orderBy(asc(candidateStageHistory.movedAt));

    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.candidateId, id));

    const [cvRow] = await db
      .select()
      .from(candidateCvAnalysis)
      .where(eq(candidateCvAnalysis.candidateId, id));

    const cvAnalysis = cvRow
      ? {
          status: cvRow.status,
          matchScore:
            cvRow.matchScore != null ? Number(cvRow.matchScore) : null,
          matchedSkills: cvRow.matchedSkills,
          missingSkills: cvRow.missingSkills,
          scoreBreakdown: cvRow.scoreBreakdown,
          errorMessage: cvRow.errorMessage,
          updatedAt: cvRow.updatedAt,
        }
      : null;

    return {
      ...candidate,
      answers,
      selections,
      history,
      offer: offer ?? null,
      cvAnalysis,
    };
  },

  async moveStage(
    candidateId: number,
    newStageId: number,
    movedBy: number | null = null,
  ): Promise<MoveStageResult> {
    return await db.transaction(async (tx) => {
      const stageAutomation: StageAutomationFlags = {};

      const [candidate] = await tx
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId));

      if (!candidate) throw new Error("Candidate not found");

      const [stage] = await tx
        .select()
        .from(jobPipelineStages)
        .where(
          and(
            eq(jobPipelineStages.id, newStageId),
            eq(jobPipelineStages.jobId, candidate.jobId),
          ),
        );

      if (!stage) throw new Error("Invalid stage for this job");

      const [updated] = await tx
        .update(candidates)
        .set({
          currentStageId: newStageId,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, candidateId))
        .returning();

      if (!updated) throw new Error("Failed to update candidate");

      await tx.insert(candidateStageHistory).values({
        candidateId,
        stageId: newStageId,
        movedBy,
      });

      const [attachment] = await tx
        .select()
        .from(jobAssessmentAttachments)
        .where(
          and(
            eq(jobAssessmentAttachments.jobId, candidate.jobId),
            eq(jobAssessmentAttachments.triggerStageId, newStageId),
          ),
        );

      if (attachment) {
        const { didSendInvite } =
          await assessmentExecutionService.inviteCandidate(
            candidateId,
            attachment.assessmentId,
          );
        stageAutomation.assessmentInvite = didSendInvite
          ? "sent"
          : "skipped_active_invite";
      }

      if (stage.stageType === "offer") {
        const job = await jobService.getById(candidate.jobId);
        if (job) {
          const [existingOpenOffer] = await tx
            .select({ id: offers.id })
            .from(offers)
            .where(
              and(
                eq(offers.candidateId, candidate.id),
                eq(offers.jobId, job.id),
                inArray(offers.status, [
                  "draft",
                  "sent",
                  "pending",
                  "accepted",
                ]),
              ),
            )
            .limit(1);

          if (existingOpenOffer) {
            stageAutomation.offer = "skipped_open_exists";
          } else {
            let salary: number | null = null;
            let blockAutoSend = false;

            if (job.salaryType === "range" && job.salaryMin && job.salaryMax) {
              salary = (Number(job.salaryMin) + Number(job.salaryMax)) / 2;
              blockAutoSend = true;
            } else if (job.salaryType === "fixed" && job.salaryFixed) {
              salary = Number(job.salaryFixed);
            } else if (!job.salaryType) {
              blockAutoSend = true;
            }

            const mode =
              blockAutoSend || stage.offerMode === "auto_draft"
                ? "draft"
                : "sent";

            let expiryDate: string | null = null;
            if (stage.offerExpiryDays) {
              const expiry = new Date();
              expiry.setDate(expiry.getDate() + stage.offerExpiryDays);
              expiryDate = expiry.toISOString();
            }

            await offerService.create({
              candidateId: candidate.id,
              jobId: job.id,
              templateId: stage.offerTemplateId,
              salary,
              currency: job.currency,
              payFrequency: job.payFrequency,
              expiryDate,
              status: mode,
              createdBy: movedBy ?? 1,
            });
            stageAutomation.offer = "created";
          }
        }
      }

      if (stage.stageType === "rejection") {
        if (stage.rejectionTemplateId) {
          if (candidate.rejectionNoticeSentAt) {
            stageAutomation.rejectionEmail = "skipped_already_sent";
          } else {
            const [template] = await tx
              .select()
              .from(templates)
              .where(eq(templates.id, stage.rejectionTemplateId));

            if (template) {
              const context = await variableService.getContextForCandidate(
                candidate.id,
              );
              const { subject, html } = templateEngineService.compileTemplate(
                template.subject,
                template.bodyJson,
                context,
              );

              await mailService.sendRejectionEmail(
                candidate.email,
                subject,
                html,
              );

              await tx
                .update(candidates)
                .set({
                  rejectionNoticeSentAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(candidates.id, candidateId));

              stageAutomation.rejectionEmail = "sent";
            }
          }
        }
      }

      return { candidate: updated, stageAutomation };
    });
  },

  async updateBasicDetails(id: number, data: CandidateBasicUpdateInput) {
    const [existing] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id))
      .limit(1);

    if (!existing) return null;

    const [updated] = await db
      .update(candidates)
      .set(
        clean({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          resumeUrl: data.resumeUrl,
          updatedAt: new Date(),
        }),
      )
      .where(eq(candidates.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id: number) {
    const [deleted] = await db
      .delete(candidates)
      .where(eq(candidates.id, id))
      .returning();
    return deleted ?? null;
  },
};

//TODO: implement kafka
