import { z } from "zod";
import { McpHttpClient } from "./mcp-client";
import { PARAFORM_MCP_URL } from "./oauth";

/** A role the company is hiring for on Paraform. */
export type ParaformRole = {
  id: string;
  title: string;
};

/**
 * A candidate a Paraform recruiter submitted to one role (an "application" in Paraform's words).
 * Paraform shares no email or phone field; both are only in the CV text, if anywhere.
 */
export type ParaformSubmission = {
  id: string;
  roleId: string;
  /** One string, sometimes shortened by Paraform to "First L.". */
  name: string;
  resumeText: string | null;
  /** The recruiter's notes on why the candidate fits, joined into one text. */
  note: string | null;
  /** The application on Paraform. Only a paraform.com address over https is kept. */
  url: string | null;
};

/** Everything the sync asks of Paraform. The sync and its tests depend on this, not on MCP. */
export interface ParaformApi {
  /** Resolves when the account may use the hiring-manager tools; throws McpAuthError when not. */
  checkAccess(): Promise<void>;
  listRoles(): Promise<ParaformRole[]>;
  /** The ids of the role's submissions that are still open: not rejected and not hired. */
  listSubmissionIds(roleId: string): Promise<string[]>;
  getSubmission(id: string): Promise<ParaformSubmission>;
}

/** Paraform answered, but not in the shape this version of OpenATS reads. */
export class ParaformUnexpectedAnswerError extends Error {
  constructor(tool: string) {
    super(`Paraform's "${tool}" answered in a shape OpenATS does not read`);
    this.name = "ParaformUnexpectedAnswerError";
  }
}

/**
 * The submissions still open on Paraform. Rejected ones are left out, and hired ones too: a hire
 * was made on Paraform, and importing it would put that person back in the first stage.
 */
export const OPEN_SUBMISSION_STATUSES = [
  "SUBMITTED",
  "REVIEWED",
  "INTERVIEWING",
  "BACKBURNER",
  "OFFER",
] as const;

/** Stops a server that keeps answering with a next page from holding the sync forever. */
const MAX_PAGES = 100;

// Only the fields OpenATS uses are checked; Paraform may add others.
const rolesAnswer = z.object({
  roles: z.array(z.object({ id: z.string().min(1), name: z.string() })),
});

const offset = z.union([z.number(), z.string()]).nullish();

const candidatesAnswer = z.object({
  candidates: z.array(z.object({ applicationId: z.string().min(1) })),
  nextOffset: offset,
});

const candidateAnswer = z.object({
  applicationId: z.string().min(1),
  roleId: z.string().min(1),
  name: z.string(),
  resumeText: z.string().nullish(),
  submissionNotes: z
    .object({
      greatFitReason: z.string().nullish(),
      additionalInfo: z.string().nullish(),
      openEnded: z.string().nullish(),
    })
    .nullish(),
  url: z.string().nullish(),
});

function parse<T>(tool: string, schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ParaformUnexpectedAnswerError(tool);
  return result.data;
}

/** Keeps a link only when it is an https address on paraform.com, since the UI renders it. */
export function paraformLink(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const onParaform = host === "paraform.com" || host.endsWith(".paraform.com");
    return parsed.protocol === "https:" && onParaform ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function joinNotes(
  notes: z.infer<typeof candidateAnswer>["submissionNotes"],
): string | null {
  const parts = [notes?.greatFitReason, notes?.additionalInfo, notes?.openEnded]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length ? parts.join("\n\n") : null;
}

/**
 * ParaformApi over Paraform's hiring-manager MCP server. The tools act for the hiring manager who
 * connected, so they see only that person's roles and the candidates visible to them.
 */
export function mcpParaformApi(
  getAccessToken: () => Promise<string>,
): ParaformApi {
  const client = new McpHttpClient(PARAFORM_MCP_URL, getAccessToken);
  return {
    // Any answer means the account has access. Paraform answers 403
    // "This account has no HM or recruiter MCP access" when it does not.
    async checkAccess() {
      await client.callTool("getIdentity");
    },

    async listRoles() {
      const { roles } = parse(
        "listHmRoles",
        rolesAnswer,
        await client.callTool("listHmRoles"),
      );
      return roles.map((role) => ({ id: role.id, title: role.name }));
    },

    async listSubmissionIds(roleId) {
      const ids: string[] = [];
      let offsetValue: number | string = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const answer: z.infer<typeof candidatesAnswer> = parse(
          "listHmCandidates",
          candidatesAnswer,
          await client.callTool("listHmCandidates", {
            roleId,
            status: [...OPEN_SUBMISSION_STATUSES],
            offset: offsetValue,
          }),
        );
        ids.push(...answer.candidates.map((row) => row.applicationId));
        if (answer.nextOffset === null || answer.nextOffset === undefined) {
          return [...new Set(ids)];
        }
        offsetValue = answer.nextOffset;
      }
      throw new ParaformUnexpectedAnswerError("listHmCandidates");
    },

    async getSubmission(id) {
      const answer = parse(
        "getHmCandidate",
        candidateAnswer,
        await client.callTool("getHmCandidate", { applicationId: id }),
      );
      return {
        id: answer.applicationId,
        roleId: answer.roleId,
        name: answer.name,
        resumeText: answer.resumeText?.trim() || null,
        note: joinNotes(answer.submissionNotes),
        url: paraformLink(answer.url),
      };
    },
  };
}
