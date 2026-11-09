import { McpHttpClient } from "./mcp-client";
import { PARAFORM_MCP_URL } from "./oauth";

/** A role the company is hiring for on Paraform. */
export type ParaformRole = {
  id: string;
  title: string;
};

/** A candidate a Paraform recruiter submitted to one role. */
export type ParaformSubmission = {
  id: string;
  roleId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  recruiterName: string | null;
  note: string | null;
  url: string | null;
};

export type ParaformDecision = "advance" | "reject";

/** Everything the sync asks of Paraform. The sync and its tests depend on this, not on MCP. */
export interface ParaformApi {
  /** Resolves when the account may use the hiring-manager tools; throws McpAuthError when not. */
  checkAccess(): Promise<void>;
  listRoles(): Promise<ParaformRole[]>;
  listSubmissions(roleId: string): Promise<ParaformSubmission[]>;
  decide(submissionId: string, decision: ParaformDecision): Promise<void>;
}

/**
 * Thrown until the tool shapes are mapped. Paraform documents its hiring-manager tool names
 * (`listHmRoles`, `listHmCandidates`, `decideOnSubmission`) but not their arguments or results,
 * and they can only be read with an account that has hiring-manager MCP access.
 */
export class ParaformMappingPendingError extends Error {
  constructor(tool: string) {
    super(`The Paraform tool "${tool}" is not mapped yet`);
    this.name = "ParaformMappingPendingError";
  }
}

/**
 * ParaformApi over Paraform's hiring-manager MCP server.
 *
 * TODO(paraform-schemas): map each tool's arguments and result once `tools/list` can be read:
 * - listRoles       → `listHmRoles`
 * - listSubmissions → `listHmCandidates` filtered by role, 20 per page, following its cursor
 * - decide          → `decideOnSubmission` (needs decision access; it previews before changing)
 */
export function mcpParaformApi(
  getAccessToken: () => Promise<string>,
): ParaformApi {
  const client = new McpHttpClient(PARAFORM_MCP_URL, getAccessToken);
  return {
    // Needs no mapping: any answer means the account has access. Paraform answers 403
    // "This account has no HM or recruiter MCP access" when it does not.
    async checkAccess() {
      await client.callTool("getIdentity");
    },
    async listRoles() {
      throw new ParaformMappingPendingError("listHmRoles");
    },
    async listSubmissions() {
      throw new ParaformMappingPendingError("listHmCandidates");
    },
    async decide() {
      throw new ParaformMappingPendingError("decideOnSubmission");
    },
  };
}
