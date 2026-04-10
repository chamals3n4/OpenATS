import {
  eq,
  and,
  desc,
  asc,
  or,
  ilike,
  sql,
  type InferSelectModel,
} from "drizzle-orm";
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
import { assessmentExecutionService } from "./assessment-execution.service";
import { offerService } from "./offer.service";
import { templateService } from "./template.service";
import { jobService } from "./job.service";
import { socketService } from "./socket.service";
import { mailService } from "./mail.service";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";
import { cleanObject as clean } from "../utils/object.utils";

type CandidateRow = InferSelectModel<typeof candidates>;

type RejectionEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

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

export const candidateService = {
  async apply(jobId: number, input: CandidateApplyInput) {
    const { customAnswers, ...candidateData } = input;

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
      // NULL ILIKE … is NULL in Postgres, so `phone ILIKE …` breaks the whole OR when phone is null.
      // Match full name, coalesce phone, and keep per-field matches.
      conditions.push(
        or(
          ilike(candidates.firstName, pattern),
          ilike(candidates.lastName, pattern),
          ilike(candidates.email, pattern),
          ilike(sql`COALESCE(${candidates.phone}, '')`, pattern),
          sql`(${candidates.firstName} || ' ' || ${candidates.lastName}) ILIKE ${pattern}`,
        ),
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
  ) {
    const { updated, rejectionMail } = await db.transaction(
      async (tx): Promise<{
        updated: CandidateRow | undefined;
        rejectionMail: RejectionEmailPayload | null;
      }> => {
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

      const [row] = await tx
        .update(candidates)
        .set({
          currentStageId: newStageId,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, candidateId))
        .returning();

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
        await assessmentExecutionService.inviteCandidate(
          candidateId,
          attachment.assessmentId,
        );
      }

      if (stage.stageType === "offer") {
        const job = await jobService.getById(candidate.jobId);
        if (job) {
          let salary: number | null = null;

          if (job.salaryType === "range" && job.salaryMin && job.salaryMax) {
            salary = (Number(job.salaryMin) + Number(job.salaryMax)) / 2;
          } else if (job.salaryType === "fixed" && job.salaryFixed) {
            salary = Number(job.salaryFixed);
          }

          // Offers always start as draft so recruiters can review the letter before sending.
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

          const existingOffer = await tx
            .select({ id: offers.id })
            .from(offers)
            .where(
              and(
                eq(offers.candidateId, candidate.id),
                eq(offers.jobId, job.id),
              ),
            )
            .limit(1);

          if (existingOffer.length === 0) {
            await offerService.create({
              candidateId: candidate.id,
              jobId: job.id,
              templateId: offerTemplateId,
              salary,
              currency: job.currency,
              payFrequency: job.payFrequency,
              expiryDate,
              status: "draft",
              createdBy: movedBy ?? 1,
            });
          }
        }
      }

      let rejectionMail: RejectionEmailPayload | null = null;

      if (stage.stageType === "rejection") {
        let rejectionTemplateId = stage.rejectionTemplateId;
        if (!rejectionTemplateId) {
          rejectionTemplateId =
            (await templateService.getDefaultTemplateIdForType(
              "rejection",
            )) ?? null;
        }

        if (rejectionTemplateId && candidate.email?.trim()) {
          const [template] = await tx
            .select()
            .from(templates)
            .where(eq(templates.id, rejectionTemplateId));

          if (template) {
            const context = await variableService.getContextForCandidate(
              candidate.id,
            );
            const { subject, html } = templateEngineService.compileTemplate(
              template.subject,
              template.bodyJson,
              context,
            );
            rejectionMail = {
              to: candidate.email.trim(),
              subject,
              html,
            };
          }
        }
      }

      return { updated: row, rejectionMail };
    });

    if (rejectionMail) {
      try {
        await mailService.sendRejectionEmail(
          rejectionMail.to,
          rejectionMail.subject,
          rejectionMail.html,
        );
      } catch (err) {
        console.error(
          "[candidate] moveStage: rejection email failed (stage move already saved)",
          err instanceof Error ? err.message : err,
        );
      }
    }

    return updated;
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
