import crypto from "node:crypto";
import { and, desc, eq, lt, or, gt } from "drizzle-orm";
import { db } from "../../db";
import {
  assignments,
  candidateAssignments,
  candidates,
  jobAssignmentAttachments,
  jobPipelineStages,
  type AssignmentResource,
  type SubmissionField,
} from "../../db/schema";
import { assignmentInviteEmail } from "../../shared/services/candidate-emails";
import { emailContext, sendCandidateEmail } from "../../shared/services/candidate-mailer";
import { dueDateFor, isOpenForSubmission } from "./assignment-rules";
import { frontendUrl } from "../../utils/frontend-url";

export interface AssignmentInput {
  title: string;
  description: string;
  resources: AssignmentResource[];
  submissionFields: SubmissionField[];
  dueDays: number;
}

export class AssignmentClosedError extends Error {
  constructor() {
    super("The deadline for this assignment has passed");
    this.name = "AssignmentClosedError";
  }
}

export class AssignmentAlreadySubmittedError extends Error {
  constructor() {
    super("This assignment has already been handed in");
    this.name = "AssignmentAlreadySubmittedError";
  }
}

export const assignmentService = {
  async getAll() {
    return db.select().from(assignments).orderBy(assignments.createdAt);
  },

  async getById(id: number) {
    const [row] = await db.select().from(assignments).where(eq(assignments.id, id));
    return row ?? null;
  },

  async create(input: AssignmentInput, createdBy: number) {
    const [row] = await db.insert(assignments).values({ ...input, createdBy }).returning();
    return row!;
  },

  async update(id: number, input: Partial<AssignmentInput>) {
    const [row] = await db
      .update(assignments)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return row ?? null;
  },

  async delete(id: number) {
    const [row] = await db.delete(assignments).where(eq(assignments.id, id)).returning({ id: assignments.id });
    return !!row;
  },

  /** The private page a candidate opens to read the brief and hand in their work. */
  linkFor(token: string) {
    return frontendUrl(`/assignment/${token}`);
  },

  /**
   * The invitation as the candidate would get it, for staff to check before sending. Built by the
   * same function as the real email; nothing is saved or sent, and no link exists yet.
   */
  async previewInvite(candidateId: number, assignmentId: number) {
    const assignment = await this.getById(assignmentId);
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!assignment || !candidate) return null;
    const email = assignmentInviteEmail({
      ...(await emailContext("assignment_invite")),
      firstName: candidate.firstName,
      assignmentTitle: assignment.title,
      assignmentUrl: `${this.linkFor("created-when-sent")}`,
      dueAt: dueDateFor(new Date(), assignment.dueDays),
    });
    return { to: candidate.email, subject: email.subject, html: email.html };
  },

  /**
   * Gives a candidate an assignment. One that is still open or already handed in is returned as
   * it is, with no second email. With `email: false` only the link is made, for staff to pass on
   * themselves.
   */
  async send(candidateId: number, assignmentId: number, options: { dueDays?: number; email?: boolean } = {}) {
    const { dueDays, email: notify = true } = options;
    const now = new Date();

    const [existing] = await db
      .select()
      .from(candidateAssignments)
      .where(
        and(
          eq(candidateAssignments.candidateId, candidateId),
          eq(candidateAssignments.assignmentId, assignmentId),
          or(
            eq(candidateAssignments.status, "submitted"),
            and(eq(candidateAssignments.status, "pending"), gt(candidateAssignments.dueAt, now)),
          ),
        ),
      )
      .orderBy(desc(candidateAssignments.createdAt))
      .limit(1);
    if (existing) return { sent: existing, didSendInvite: false, created: false, url: this.linkFor(existing.token) };

    const assignment = await this.getById(assignmentId);
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!assignment || !candidate) return null;

    const dueAt = dueDateFor(now, dueDays ?? assignment.dueDays);
    const token = crypto.randomBytes(32).toString("hex");
    const [sent] = await db
      .insert(candidateAssignments)
      .values({ candidateId, assignmentId, token, dueAt, submissionFields: assignment.submissionFields })
      .returning();
    if (!sent) throw new Error("Failed to send the assignment");

    const url = this.linkFor(token);
    if (!notify) return { sent, didSendInvite: false, created: true, url };

    const email = assignmentInviteEmail({
      ...(await emailContext("assignment_invite")),
      firstName: candidate.firstName,
      assignmentTitle: assignment.title,
      assignmentUrl: url,
      dueAt,
    });
    const result = await sendCandidateEmail({
      candidateId,
      to: candidate.email,
      kind: "assignment_invite",
      ...email,
    });
    if (!result.sent) {
      // Without this the link would exist but never reach the candidate, and sending again would
      // find it and send nothing.
      await db.delete(candidateAssignments).where(eq(candidateAssignments.id, sent.id));
      throw new Error(result.error ?? "The email could not be sent");
    }

    return { sent, didSendInvite: true, created: true, url };
  },

  async getJobAttachments(jobId: number) {
    return db
      .select({
        id: jobAssignmentAttachments.id,
        assignmentId: jobAssignmentAttachments.assignmentId,
        triggerStageId: jobAssignmentAttachments.triggerStageId,
        createdAt: jobAssignmentAttachments.createdAt,
      })
      .from(jobAssignmentAttachments)
      .where(eq(jobAssignmentAttachments.jobId, jobId));
  },

  /** Null when the stage is not one of this job's. A stage has at most one assignment. */
  async attachToStage(jobId: number, assignmentId: number, triggerStageId: number) {
    const [stage] = await db
      .select({ id: jobPipelineStages.id })
      .from(jobPipelineStages)
      .where(and(eq(jobPipelineStages.id, triggerStageId), eq(jobPipelineStages.jobId, jobId)));
    if (!stage) return null;
    const [row] = await db
      .insert(jobAssignmentAttachments)
      .values({ jobId, assignmentId, triggerStageId })
      .returning();
    return row ?? null;
  },

  async detachFromStage(jobId: number, attachmentId: number) {
    const [row] = await db
      .delete(jobAssignmentAttachments)
      .where(and(eq(jobAssignmentAttachments.id, attachmentId), eq(jobAssignmentAttachments.jobId, jobId)))
      .returning({ id: jobAssignmentAttachments.id });
    return !!row;
  },

  /** The assignment a job sends when candidates reach this stage, if any. */
  async getForStage(jobId: number, stageId: number) {
    const [row] = await db
      .select({ assignmentId: jobAssignmentAttachments.assignmentId })
      .from(jobAssignmentAttachments)
      .where(and(eq(jobAssignmentAttachments.jobId, jobId), eq(jobAssignmentAttachments.triggerStageId, stageId)));
    return row?.assignmentId ?? null;
  },

  async getForCandidate(candidateId: number) {
    return db
      .select({
        id: candidateAssignments.id,
        assignmentId: candidateAssignments.assignmentId,
        title: assignments.title,
        status: candidateAssignments.status,
        dueAt: candidateAssignments.dueAt,
        submittedAt: candidateAssignments.submittedAt,
        submissionFields: candidateAssignments.submissionFields,
        submissionAnswers: candidateAssignments.submissionAnswers,
        token: candidateAssignments.token,
        createdAt: candidateAssignments.createdAt,
      })
      .from(candidateAssignments)
      .innerJoin(assignments, eq(candidateAssignments.assignmentId, assignments.id))
      .where(eq(candidateAssignments.candidateId, candidateId))
      .orderBy(desc(candidateAssignments.createdAt));
  },

  async getByToken(token: string) {
    const [row] = await db
      .select({
        id: candidateAssignments.id,
        status: candidateAssignments.status,
        dueAt: candidateAssignments.dueAt,
        submittedAt: candidateAssignments.submittedAt,
        submissionFields: candidateAssignments.submissionFields,
        submissionAnswers: candidateAssignments.submissionAnswers,
        title: assignments.title,
        description: assignments.description,
        resources: assignments.resources,
        firstName: candidates.firstName,
      })
      .from(candidateAssignments)
      .innerJoin(assignments, eq(candidateAssignments.assignmentId, assignments.id))
      .innerJoin(candidates, eq(candidateAssignments.candidateId, candidates.id))
      .where(eq(candidateAssignments.token, token));
    return row ?? null;
  },

  /**
   * Hands in the work, once. A conditional update on a pending row, so a late request cannot slip
   * past the deadline and two requests at once cannot both be saved.
   */
  async submit(token: string, answers: Record<string, string>) {
    const current = await this.getByToken(token);
    if (!current) return null;
    const now = new Date();
    if (current.status === "submitted") throw new AssignmentAlreadySubmittedError();
    if (!isOpenForSubmission(current.status, current.dueAt, now)) throw new AssignmentClosedError();

    const [row] = await db
      .update(candidateAssignments)
      .set({
        status: "submitted",
        submittedAt: now,
        submissionAnswers: answers,
        updatedAt: now,
      })
      .where(
        and(
          eq(candidateAssignments.token, token),
          eq(candidateAssignments.status, "pending"),
          gt(candidateAssignments.dueAt, now),
        ),
      )
      .returning({ id: candidateAssignments.id, candidateId: candidateAssignments.candidateId });
    if (!row) {
      // Lost a race: say which way, so the page shows the right message
      const [latest] = await db
        .select({ status: candidateAssignments.status })
        .from(candidateAssignments)
        .where(eq(candidateAssignments.token, token));
      throw latest?.status === "submitted" ? new AssignmentAlreadySubmittedError() : new AssignmentClosedError();
    }
    return row;
  },

  /** Marks assignments whose deadline passed with nothing handed in. */
  async expireOverdue(now: Date = new Date()): Promise<number> {
    const rows = await db
      .update(candidateAssignments)
      .set({ status: "expired", updatedAt: now })
      .where(and(eq(candidateAssignments.status, "pending"), lt(candidateAssignments.dueAt, now)))
      .returning({ id: candidateAssignments.id });
    return rows.length;
  },

  /** Whose assignment this is, to check access to that candidate. */
  async getOwner(sentId: number) {
    const [row] = await db
      .select({ candidateId: candidateAssignments.candidateId })
      .from(candidateAssignments)
      .where(eq(candidateAssignments.id, sentId));
    return row ?? null;
  },
};
