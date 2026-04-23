import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
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
  offerResponseAttempts,
  templates,
  assessments,
} from "../db/schema";
import type { Candidate } from "../db/schema/candidates";
import type { JobPipelineStage } from "../db/schema/pipeline";
import logger from "../utils/logger";
import { assessmentExecutionService } from "./assessment-execution.service";
import { offerService } from "./offer.service";
import { jobService } from "./job.service";
import { socketService } from "./socket.service";
import { mailService } from "./mail.service";
import {
  ragAssessmentService,
  ragIndividualAssessmentDescriptionRegex,
} from "./rag-assessment.service";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";
import { cleanObject as clean } from "../utils/object.utils";
import { templateService } from "./template.service";

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

type JobWithRelations = NonNullable<
  Awaited<ReturnType<typeof jobService.getById>>
>;

function computeOfferFieldsForJobStage(
  job: JobWithRelations,
  stage: JobPipelineStage,
): {
  salary: number | null;
  expiryDate: string | null;
  status: "draft" | "sent";
} {
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

  const status =
    blockAutoSend || stage.offerMode === "auto_draft" ? "draft" : "sent";

  let expiryDate: string | null = null;
  if (stage.offerExpiryDays) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + stage.offerExpiryDays);
    expiryDate = expiry.toISOString();
  }

  return { salary, expiryDate, status };
}

async function repairCandidatePipelineSnapshot(
  candidateId: number,
  candidate: Candidate,
  history: (typeof candidateStageHistory.$inferSelect)[],
  offer: typeof offers.$inferSelect | undefined,
): Promise<{
  history: (typeof candidateStageHistory.$inferSelect)[];
  offer: typeof offers.$inferSelect | null;
}> {
  let historyOut = history;
  let offerOut: typeof offers.$inferSelect | null = offer ?? null;

  if (!candidate.currentStageId) {
    return { history: historyOut, offer: offerOut };
  }

  const [stageRow] = await db
    .select()
    .from(jobPipelineStages)
    .where(
      and(
        eq(jobPipelineStages.id, candidate.currentStageId),
        eq(jobPipelineStages.jobId, candidate.jobId),
      ),
    );

  if (!stageRow) {
    return { history: historyOut, offer: offerOut };
  }

  const hasCurrentInHistory = historyOut.some(
    (h) => h.stageId === candidate.currentStageId,
  );

  if (!hasCurrentInHistory) {
    await db.insert(candidateStageHistory).values({
      candidateId,
      stageId: candidate.currentStageId,
      movedBy: null,
    });
    logger.warn(
      `[candidate.getById] Backfilled missing stage history for candidate ${candidateId} → stage ${candidate.currentStageId}`,
    );
    historyOut = await db
      .select()
      .from(candidateStageHistory)
      .where(eq(candidateStageHistory.candidateId, candidateId))
      .orderBy(asc(candidateStageHistory.movedAt));
  }

  if (stageRow.stageType !== "offer") {
    return { history: historyOut, offer: offerOut };
  }

  const [existingOpenOffer] = await db
    .select({ id: offers.id })
    .from(offers)
    .where(
      and(
        eq(offers.candidateId, candidateId),
        eq(offers.jobId, candidate.jobId),
        inArray(offers.status, ["draft", "sent", "pending", "accepted"]),
      ),
    )
    .limit(1);

  if (existingOpenOffer) {
    const [latest] = await db
      .select()
      .from(offers)
      .where(eq(offers.candidateId, candidateId))
      .orderBy(desc(offers.createdAt))
      .limit(1);
    offerOut = latest ?? offerOut;
    return { history: historyOut, offer: offerOut };
  }

  const job = await jobService.getById(candidate.jobId);
  if (!job) {
    return { history: historyOut, offer: offerOut };
  }

  const { salary, expiryDate } = computeOfferFieldsForJobStage(job, stageRow);
  try {
    await offerService.create(
      {
        candidateId,
        jobId: job.id,
        templateId: stageRow.offerTemplateId,
        salary,
        currency: job.currency,
        payFrequency: job.payFrequency,
        expiryDate,
        status: "draft",
        createdBy: 1,
      },
      db,
    );
    logger.warn(
      `[candidate.getById] Backfilled missing offer row for candidate ${candidateId} (offer stage ${stageRow.id})`,
    );
  } catch (e) {
    console.error(
      `[candidate.getById] Failed to repair offer for candidate ${candidateId}:`,
      e,
    );
  }

  const [latestOffer] = await db
    .select()
    .from(offers)
    .where(eq(offers.candidateId, candidateId))
    .orderBy(desc(offers.createdAt))
    .limit(1);

  return { history: historyOut, offer: latestOffer ?? offerOut };
}

export const candidateService = {
  async apply(jobId: number, input: CandidateApplyInput) {
    const { customAnswers, ...rest } = input;
    const normalizedEmail = rest.email.trim().toLowerCase();
    const candidateData = { ...rest, email: normalizedEmail };

    try {
      const candidate = await db.transaction(async (tx) => {
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

      // Send candidate acknowledgement email from the default
      // "application_received" template. If none is marked default,
      // fall back to the most recently created template of this type.
      try {
        logger.info(
          `Application received email flow started: candidateId=${candidate.id}, email="${candidate.email}"`,
        );
        let selectedTemplate = await templateService.getDefaultByType(
          "application_received",
        );
        if (!selectedTemplate) {
          const appReceivedTemplates = await templateService.getByType(
            "application_received",
          );
          logger.info(
            `Application received templates found: count=${appReceivedTemplates.length}, candidateId=${candidate.id}`,
          );
          selectedTemplate =
            appReceivedTemplates[appReceivedTemplates.length - 1] ?? null;
          if (selectedTemplate) {
            logger.warn(
              `No default application_received template set; falling back to templateId=${selectedTemplate.id}`,
            );
          }
        }

        if (selectedTemplate) {
          const context = await variableService.getContextForCandidate(
            candidate.id,
          );
          const to = String(context.email ?? "").trim();
          if (!to) {
            logger.warn(
              `Skipping application received email for candidateId=${candidate.id}: candidate email missing in context`,
            );
          } else {
            logger.info(
              `Compiling application received template: candidateId=${candidate.id}, templateId=${selectedTemplate.id}, to="${to}"`,
            );
            const { subject, html } = templateEngineService.compileTemplate(
              selectedTemplate.subject,
              selectedTemplate.bodyJson,
              context,
            );
            if (!subject.trim() || !html.trim()) {
              logger.warn(
                `Skipping application received email for candidateId=${candidate.id}: templateId=${selectedTemplate.id} compiled subject/html is empty`,
              );
            } else {
              logger.info(
                `Sending application received email: candidateId=${candidate.id}, templateId=${selectedTemplate.id}, subjectLength=${subject.length}, htmlLength=${html.length}`,
              );
              await mailService.sendEmail({ to, subject, html });
              logger.info(
                `Application received email sent for candidateId=${candidate.id} using templateId=${selectedTemplate.id}`,
              );
            }
          }
        } else {
          logger.warn(
            `Skipping application received email for candidateId=${candidate.id}: no application_received template found`,
          );
        }
      } catch (emailError) {
        // Application should never fail because of email delivery issues.
        logger.error(
          `Failed to send application received email for candidateId=${candidate.id}: ${(emailError as Error)?.message}`,
        );
      }

      return candidate;
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

    const answersPromise = db
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

    const selectionsPromise = db
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

    const historyPromise = db
      .select()
      .from(candidateStageHistory)
      .where(eq(candidateStageHistory.candidateId, id))
      .orderBy(asc(candidateStageHistory.movedAt));

    const offerPromise = db
      .select()
      .from(offers)
      .where(eq(offers.candidateId, id))
      .orderBy(desc(offers.createdAt))
      .limit(1);

    const cvPromise = db
      .select()
      .from(candidateCvAnalysis)
      .where(eq(candidateCvAnalysis.candidateId, id))
      .limit(1);

    const attemptsPromise =
      assessmentExecutionService.getAttemptsByCandidate(id);

    const [
      answers,
      selections,
      history,
      offerRows,
      cvRows,
      assessmentAttempts,
    ] = await Promise.all([
      answersPromise,
      selectionsPromise,
      historyPromise,
      offerPromise,
      cvPromise,
      attemptsPromise,
    ]);

    const offer = offerRows[0];
    const [cvRow] = cvRows;

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

    const { history: historyFixed, offer: offerFixed } =
      await repairCandidatePipelineSnapshot(id, candidate, history, offer);

    const [offerResponse] = offerFixed
      ? await db
          .select({
            id: offerResponseAttempts.id,
            status: offerResponseAttempts.status,
            expiresAt: offerResponseAttempts.expiresAt,
            respondedAt: offerResponseAttempts.respondedAt,
            responderName: offerResponseAttempts.responderName,
            candidateMessage: offerResponseAttempts.candidateMessage,
            isActive: offerResponseAttempts.isActive,
            updatedAt: offerResponseAttempts.updatedAt,
          })
          .from(offerResponseAttempts)
          .where(eq(offerResponseAttempts.offerId, offerFixed.id))
          .orderBy(desc(offerResponseAttempts.createdAt))
          .limit(1)
      : [null];

    const stageIds = [...new Set(historyFixed.map((h) => h.stageId))];
    let historyOut = historyFixed;
    if (stageIds.length > 0) {
      const stageRows = await db
        .select({
          id: jobPipelineStages.id,
          name: jobPipelineStages.name,
        })
        .from(jobPipelineStages)
        .where(inArray(jobPipelineStages.id, stageIds));
      const nameById = Object.fromEntries(stageRows.map((r) => [r.id, r.name]));
      historyOut = historyFixed.map((h) => ({
        ...h,
        stageName: nameById[h.stageId] ?? null,
      }));
    }

    return {
      ...candidate,
      answers,
      selections,
      history: historyOut,
      offer: offerFixed,
      offerResponse,
      cvAnalysis,
      assessmentAttempts,
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
            const { salary, expiryDate, status } =
              computeOfferFieldsForJobStage(job, stage);

            await offerService.create(
              {
                candidateId: candidate.id,
                jobId: job.id,
                templateId: stage.offerTemplateId,
                salary,
                currency: job.currency,
                payFrequency: job.payFrequency,
                expiryDate,
                status,
                createdBy: movedBy ?? 1,
              },
              tx,
            );
            stageAutomation.offer = "created";
          }
        }
      }

      if (stage.stageType === "rejection") {
        if (candidate.rejectionNoticeSentAt) {
          stageAutomation.rejectionEmail = "skipped_already_sent";
        } else {
          let template = null;
          if (stage.rejectionTemplateId) {
            const [configuredTemplate] = await tx
              .select()
              .from(templates)
              .where(eq(templates.id, stage.rejectionTemplateId));
            template = configuredTemplate ?? null;
          }

          if (!template) {
            template = await templateService.getDefaultByType("rejection");
          }

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
};

//TODO: implement kafka
