import { and, desc, eq, gt, or } from "drizzle-orm";
import { db } from "../db";
import {
  assessments,
  candidateAssessmentAttempts,
  candidates,
  company,
  departments,
  jobs,
  offers,
} from "../db/schema";
import { TemplateContext } from "./template-engine.service";

export const variableService = {
  async getContextForCandidate(candidateId: number): Promise<TemplateContext> {
    const [row] = await db
      .select({
        candidate: candidates,
        job: jobs,
        company: company,
      })
      .from(candidates)
      .leftJoin(jobs, eq(candidates.jobId, jobs.id))
      .leftJoin(departments, eq(jobs.departmentId, departments.id))
      .leftJoin(company, eq(departments.companyId, company.id))
      .where(eq(candidates.id, candidateId))
      .limit(1);

    if (!row?.candidate) return {};

    return {
      candidate_name: `${row.candidate.firstName} ${row.candidate.lastName}`,
      email: row.candidate.email,
      job_title: row.job?.title ?? "—",
      company_name: row.company?.name ?? "—",
      start_date: "TBD",
      expiry_date: "TBD",
    };
  },

  /**
   * Offer letter variables: job/company come from the offer’s `jobId` when set,
   * so they stay correct if the schema ever allows offers on a different job than
   * the candidate’s current assignment.
   */
  async getContextForOffer(candidateId: number, offerData: { jobId?: number } & Record<string, unknown>): Promise<TemplateContext> {
    const jobId =
      typeof offerData.jobId === "number" && Number.isFinite(offerData.jobId)
        ? offerData.jobId
        : undefined;

    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId));

    if (!candidate) return {};

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;

    if (jobId != null) {
      const [row] = await db
        .select({
          job: jobs,
          department: departments,
          company: company,
        })
        .from(jobs)
        .innerJoin(departments, eq(jobs.departmentId, departments.id))
        .innerJoin(company, eq(departments.companyId, company.id))
        .where(eq(jobs.id, jobId));

      if (row) {
        return this._offerOverlay(
          {
            candidate_name: candidateName,
            job_title: row.job.title,
            company_name: row.company.name,
            start_date: "TBD",
            expiry_date: "TBD",
          },
          offerData,
        );
      }
    }

    const baseContext = await this.getContextForCandidate(candidateId);
    return this._offerOverlay(
      {
        ...baseContext,
        candidate_name: candidateName,
      },
      offerData,
    );
  },

  _offerOverlay(
    base: TemplateContext,
    offerData: Record<string, unknown>,
  ): TemplateContext {
    const benefitsRaw =
      offerData.benefits != null && String(offerData.benefits).trim()
        ? String(offerData.benefits).trim()
        : "";

    const payFreq =
      offerData.payFrequency != null && String(offerData.payFrequency).trim()
        ? String(offerData.payFrequency).replace(/_/g, " ")
        : "";

    const sal = offerData.salary;
    /** Empty when unknown — `renderOfferEmailBodyHTML` drops incomplete lines (no “TBD” in sent mail). */
    const salaryOut: string | number =
      sal == null || sal === ""
        ? ""
        : typeof sal === "number"
          ? sal
          : String(sal);

    return {
      ...base,
      /** Offer letters should not embed the full posting; templates may reference this key. */
      job_description: "",
      job_description_html: "",
      salary: salaryOut,
      currency:
        offerData.currency != null && offerData.currency !== ""
          ? String(offerData.currency)
          : "",
      pay_frequency: payFreq,
      start_date:
        offerData.startDate != null && String(offerData.startDate).trim()
          ? String(offerData.startDate)
          : "",
      expiry_date:
        offerData.expiryDate != null && String(offerData.expiryDate).trim()
          ? String(offerData.expiryDate)
          : "",
      benefits: benefitsRaw,
    };
  },

  /**
   * General templates list salary/benefits/assessment_link; merge candidate + latest offer + invite link.
   */
  async getContextForGeneralTemplatePreview(
    candidateId: number,
  ): Promise<TemplateContext> {
    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.candidateId, candidateId))
      .orderBy(desc(offers.updatedAt))
      .limit(1);

    let ctx: TemplateContext;
    if (offer) {
      ctx = await this.getContextForOffer(candidateId, offer);
    } else {
      const base = await this.getContextForCandidate(candidateId);
      ctx = this._offerOverlay(base, {});
    }

    const now = new Date();
    const [attempt] = await db
      .select()
      .from(candidateAssessmentAttempts)
      .where(
        and(
          eq(candidateAssessmentAttempts.candidateId, candidateId),
          or(
            eq(candidateAssessmentAttempts.status, "pending"),
            eq(candidateAssessmentAttempts.status, "started"),
          ),
          gt(candidateAssessmentAttempts.expiresAt, now),
        ),
      )
      .orderBy(desc(candidateAssessmentAttempts.createdAt))
      .limit(1);

    let assessment_link = "—";
    let assessment_title = ctx.assessment_title ?? "—";
    if (attempt) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      assessment_link = `${frontendUrl.replace(/\/$/, "")}/assessment/${attempt.token}`;
      const [a] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.id, attempt.assessmentId))
        .limit(1);
      if (a?.title?.trim()) assessment_title = a.title.trim();
    }

    return {
      ...ctx,
      assessment_link,
      assessment_title,
    };
  },

  /**
   * Candidate-scoped preview/send context by template type (dashboard preview & ad-hoc flows).
   */
  async getContextForTemplatePreview(
    candidateId: number,
    templateType:
      | "offer"
      | "offer_withdrawal"
      | "rejection"
      | "assessment_invite"
      | "general"
      | "application_received"
      | "assessment_completion"
      | "interview_invite",
  ): Promise<TemplateContext> {
    switch (templateType) {
      case "general":
        return this.getContextForGeneralTemplatePreview(candidateId);
      case "offer_withdrawal":
        return this.getContextForCandidate(candidateId);
      case "offer": {
        const [offer] = await db
          .select()
          .from(offers)
          .where(eq(offers.candidateId, candidateId))
          .orderBy(desc(offers.updatedAt))
          .limit(1);
        if (offer) {
          return this.getContextForOffer(candidateId, offer);
        }
        const base = await this.getContextForCandidate(candidateId);
        return this._offerOverlay(base, {});
      }
      case "application_received":
        return this.getContextForCandidate(candidateId);
      case "assessment_completion": {
        const base = await this.getContextForCandidate(candidateId);
        return {
          ...base,
          assessment_title: "Sample assessment",
        };
      }
      case "interview_invite": {
        const base = await this.getContextForCandidate(candidateId);
        return {
          ...base,
          interview_date: "Mon, Jan 15, 2026",
          interview_time: "2:00 PM (your local time)",
          interview_location: "123 Main St or Remote",
          video_link: "https://example.com/meet",
          interviewer_names: "Alex Kim, Jordan Lee",
        };
      }
      default:
        return this.getContextForCandidate(candidateId);
    }
  },

  /**
   * Assessment invite email: job/company from candidate; link and expiry from the attempt.
   * If the full candidate→job→company join fails (data edge case), still fill name and link
   * so templates render and mail sends.
   */
  async getContextForAssessmentInvite(
    candidateId: number,
    assessmentTitle: string,
    assessmentLink: string,
    expiresAt: Date,
  ): Promise<TemplateContext> {
    let base = await this.getContextForCandidate(candidateId);

    if (!base.candidate_name) {
      const [c] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId))
        .limit(1);

      if (c) {
        base = {
          ...base,
          candidate_name: `${c.firstName} ${c.lastName}`,
          job_title: base.job_title ?? "—",
          company_name: base.company_name ?? "—",
        };

        if (c.jobId != null) {
          const [row] = await db
            .select({
              job: jobs,
              company: company,
            })
            .from(jobs)
            .innerJoin(departments, eq(jobs.departmentId, departments.id))
            .innerJoin(company, eq(departments.companyId, company.id))
            .where(eq(jobs.id, c.jobId))
            .limit(1);

          if (row) {
            base = {
              ...base,
              job_title: row.job.title,
              company_name: row.company.name,
            };
          }
        }
      }
    }

    const expiryStr = expiresAt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return {
      ...base,
      assessment_title: assessmentTitle,
      assessment_link: assessmentLink,
      expiry_date: expiryStr,
    };
  },

  /**
   * Variables for `assessment_completion` emails (acknowledgment only; no scores or pass/fail).
   */
  async getContextForAssessmentCompletion(
    candidateId: number,
    assessmentTitle: string,
  ): Promise<TemplateContext> {
    const base = await this.getContextForCandidate(candidateId);
    return {
      ...base,
      assessment_title: assessmentTitle,
    };
  },
};
