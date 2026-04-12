import { eq, and, desc, asc, inArray, or, ilike, sql } from "drizzle-orm";
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
  emailMessages,
  assessments,
} from "../db/schema";
import type { Candidate } from "../db/schema/candidates";
import type { ContentBlock } from "../db/schema/templates";
import { assessmentExecutionService } from "./assessment-execution.service";
import { offerService } from "./offer.service";
import { templateService } from "./template.service";
import { jobService } from "./job.service";
import { socketService } from "./socket.service";
import { formatPlainTextAsHtmlEmail, mailService } from "./mail.service";
import {
  buildApplicationReceivedFallbackInner,
  buildRejectionFallbackInner,
  wrapCompiledTemplateEmail,
  wrapFallbackEmail,
} from "../utils/email-fallback-layout";
import {
  ragAssessmentService,
  ragIndividualAssessmentDescriptionRegex,
} from "./rag-assessment.service";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";
import { cleanObject as clean } from "../utils/object.utils";
import logger from "../utils/logger";

/** Drizzle wraps driver errors; Postgres code 23505 is often on `cause`. */
function isPgUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  const seen = new Set<unknown>();
  for (
    let depth = 0;
    depth < 12 && current && typeof current === "object";
    depth++
  ) {
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

/**
 * After a successful public (or dashboard) apply: notifies the candidate.
 * Prefers default **application_received**, then legacy default **general**, then built-in HTML.
 * Callers should catch errors — a failed send must not roll back the application.
 */
async function sendApplicationReceivedConfirmation(
  candidateId: number,
): Promise<void> {
  const [c] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!c?.email?.trim()) return;

  const context = await variableService.getContextForCandidate(candidateId);
  let defaultTplId =
    await templateService.getDefaultTemplateIdForType("application_received");
  if (defaultTplId == null) {
    defaultTplId =
      await templateService.getDefaultTemplateIdForType("general");
  }
  const templateRow =
    defaultTplId != null ? await templateService.getById(defaultTplId) : null;
  const canUseTemplate =
    !!templateRow &&
    (templateRow.type === "application_received" ||
      templateRow.type === "general") &&
    Array.isArray(templateRow.bodyJson) &&
    templateRow.bodyJson.length > 0;

  let subject: string;
  let html: string;

  if (canUseTemplate && templateRow) {
    const compiled = templateEngineService.compileTemplate(
      templateRow.subject,
      templateRow.bodyJson as ContentBlock[],
      context,
    );
    subject = compiled.subject;
    html = wrapCompiledTemplateEmail(compiled.html);
  } else {
    subject = templateEngineService.replaceVariables(
      "Application received — {{job_title}}",
      context,
    );
    const name = context.candidate_name?.trim() || "there";
    const jobTitle = context.job_title?.trim() || "the role";
    const company = context.company_name?.trim() || "our company";
    html = wrapFallbackEmail(
      buildApplicationReceivedFallbackInner({
        candidateName: name,
        jobTitle,
        companyName: company,
      }),
    );
  }

  await mailService.sendEmail({
    to: c.email.trim(),
    subject: subject.slice(0, 500),
    html,
  });
}

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

    const rawSearch = filters.search?.trim();
    if (rawSearch) {
      const escaped = rawSearch
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
      const pattern = `%${escaped}%`;
      conditions.push(
        or(
          ilike(candidates.firstName, pattern),
          ilike(candidates.lastName, pattern),
          ilike(candidates.email, pattern),
          ilike(sql`COALESCE(${candidates.phone}, '')`, pattern),
          sql`(${candidates.firstName} || ' ' || ${candidates.lastName}) ILIKE ${pattern}`,
        )!,
      );
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
        stageType: jobPipelineStages.stageType,
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

    let stageName: string | null = null;
    let stageType: (typeof jobPipelineStages.$inferSelect)["stageType"] | null =
      null;
    if (candidate.currentStageId != null) {
      const [st] = await db
        .select({
          name: jobPipelineStages.name,
          stageType: jobPipelineStages.stageType,
        })
        .from(jobPipelineStages)
        .where(eq(jobPipelineStages.id, candidate.currentStageId))
        .limit(1);
      if (st) {
        stageName = st.name;
        stageType = st.stageType;
      }
    }

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
      .where(eq(offers.candidateId, id))
      .orderBy(desc(offers.createdAt))
      .limit(1);

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
      stageName,
      stageType,
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
        let combinedAssessmentId: number | null = null;
        try {
          combinedAssessmentId =
            await ragAssessmentService.createCombinedAssessmentForCandidate(
              candidateId,
              attachment.assessmentId,
              newStageId,
              movedBy,
            );
        } catch (error) {
          console.error(
            `[RAG Assessment] Failed for candidate ${candidateId} at stage ${newStageId}. Invite will be skipped.`,
            error,
          );
        }

        // Send invite only after AI-generated combined assessment is ready.
        if (combinedAssessmentId) {
          await assessmentExecutionService.inviteCandidate(
            candidateId,
            combinedAssessmentId,
          );
        } else {
          console.warn(
            `[RAG Assessment] Combined assessment not created for candidate ${candidateId} at stage ${newStageId}; invite not sent.`,
          );
        }
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

            let offerTemplateId = stage.offerTemplateId;
            if (!offerTemplateId) {
              offerTemplateId =
                (await templateService.getDefaultTemplateIdForType("offer")) ??
                null;
            }

            await offerService.create({
              candidateId: candidate.id,
              jobId: job.id,
              templateId: offerTemplateId,
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
        if (candidate.rejectionNoticeSentAt) {
          stageAutomation.rejectionEmail = "skipped_already_sent";
        } else {
          const context = await variableService.getContextForCandidate(
            candidate.id,
          );
          const name = context.candidate_name?.trim() || "there";
          const jobTitle = context.job_title?.trim() || "the role";
          const company = context.company_name?.trim() || "the company";

          let rejectionSubject: string | null = null;
          let rejectionHtml: string | null = null;

          if (stage.rejectionTemplateId) {
            const [template] = await tx
              .select()
              .from(templates)
              .where(eq(templates.id, stage.rejectionTemplateId));

            if (template) {
              try {
                const compiled = templateEngineService.compileTemplate(
                  template.subject,
                  template.bodyJson,
                  context,
                );
                rejectionSubject = compiled.subject;
                rejectionHtml = wrapCompiledTemplateEmail(compiled.html);
              } catch (err: unknown) {
                logger.warn(
                  `Rejection template render failed (templateId=${template.id}): ${(err as Error)?.message}`,
                );
              }
            }
          }

          if (!rejectionHtml) {
            if (!stage.rejectionTemplateId) {
              logger.warn(
                `Rejection stage "${stage.name}" has no template — using built-in rejection message (candidateId=${candidateId}).`,
              );
            }
            rejectionSubject = `Update regarding your application — ${jobTitle}`;
            rejectionHtml = wrapFallbackEmail(
              buildRejectionFallbackInner({
                candidateName: name,
                jobTitle,
                companyName: company,
              }),
            );
          }

          const finalSubject = rejectionSubject?.trim()
            ? rejectionSubject
            : `Update regarding your application — ${jobTitle}`;

          await mailService.sendRejectionEmail(
            candidate.email,
            finalSubject,
            rejectionHtml,
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
    return await db.transaction(async (tx) => {
      await tx
        .delete(assessments)
        .where(
          sql`${assessments.description} ~ ${ragIndividualAssessmentDescriptionRegex(id)}`,
        );
      const [deleted] = await tx
        .delete(candidates)
        .where(eq(candidates.id, id))
        .returning();
      return deleted ?? null;
    });
  },

  /** One-off email from the dashboard “Send email” tab (Resend + `email_messages` row). */
  async sendAdHocEmail(
    candidateId: number,
    sentByUserId: number,
    subject: string,
    bodyText: string,
    options?: {
      bodyHtml?: string | null | undefined;
      templateId?: number | null | undefined;
    },
  ) {
    const [c] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);
    if (!c) return { row: null, providerMessageId: null };

    const safeSubject = subject.trim().slice(0, 500);
    const trimmedHtml = options?.bodyHtml?.trim();
    const html =
      trimmedHtml && trimmedHtml.length > 0
        ? wrapCompiledTemplateEmail(trimmedHtml)
        : formatPlainTextAsHtmlEmail(bodyText);

    const sendResult = await mailService.sendEmail({
      to: c.email,
      subject: safeSubject,
      html,
    });

    const tid = options?.templateId;
    const templateIdResolved =
      typeof tid === "number" && Number.isFinite(tid) && tid > 0
        ? Math.trunc(tid)
        : null;

    const [row] = await db
      .insert(emailMessages)
      .values({
        candidateId,
        sentBy: sentByUserId,
        templateId: templateIdResolved,
        subject: safeSubject,
        bodyHtml: html,
        recipientEmail: c.email,
      })
      .returning();

    let providerMessageId: string | null = null;
    if (
      sendResult &&
      typeof sendResult === "object" &&
      "id" in sendResult
    ) {
      const id = (sendResult as { id?: string | number }).id;
      if (id !== undefined && id !== null) providerMessageId = String(id);
    }

    return {
      row: row ?? null,
      providerMessageId,
    };
  },

  sendApplicationReceivedConfirmation,
};

//TODO: implement kafka
