import { eq } from "drizzle-orm";
import { db } from "../db";
import { candidates, jobs, departments, company } from "../db/schema";
import { TemplateContext } from "./template-engine.service";

export const variableService = {
  /**
   * Gathers all standard variables for a candidate application context.
   */
  async getContextForCandidate(candidateId: number): Promise<TemplateContext> {
    const [result] = await db
      .select({
        candidate: candidates,
        job: jobs,
        department: departments,
        company: company,
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .innerJoin(departments, eq(jobs.departmentId, departments.id))
      .innerJoin(company, eq(departments.companyId, company.id))
      .where(eq(candidates.id, candidateId));

    if (!result) return {};

    return {
      candidate_name: `${result.candidate.firstName} ${result.candidate.lastName}`,
      job_title: result.job.title,
      company_name: result.company.name,
      // Default values or placeholders for dates if not yet set
      start_date: "TBD",
      expiry_date: "TBD",
    };
  },

  /**
   * Refines the context with specific offer information.
   */
  async getContextForOffer(candidateId: number, offerData: any): Promise<TemplateContext> {
    const baseContext = await this.getContextForCandidate(candidateId);
    
    return {
      ...baseContext,
      salary: offerData.salary ?? "TBD",
      currency: offerData.currency ?? "",
      start_date: offerData.startDate || "TBD",
      expiry_date: offerData.expiryDate || "TBD",
    };
  }
};
