import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mcpParaformApi,
  paraformLink,
  ParaformUnexpectedAnswerError,
} from "../../src/shared/integrations/paraform/paraform-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

type ToolCall = { name: string; arguments: Record<string, unknown> };

/**
 * A fake of Paraform's MCP server. Answers follow the shapes its hiring-manager tools returned
 * on 2026-11-10, with made-up people, and come back as JSON in a text block, as Paraform's do.
 */
function fakeParaform(answer: (call: ToolCall) => unknown) {
  const calls: ToolCall[] = [];
  const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
    const message = JSON.parse(init.body) as { id?: number; method: string; params: ToolCall };
    if (message.id === undefined) return new Response(null, { status: 202 });
    let result: unknown = {};
    if (message.method === "tools/call") {
      calls.push(message.params);
      result = { content: [{ type: "text", text: JSON.stringify(answer(message.params)) }] };
    }
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { api: mcpParaformApi(async () => "tok"), calls };
}

describe("listRoles", () => {
  it("reads each role's id and name", async () => {
    const { api } = fakeParaform(() => ({
      totalCount: 2,
      roles: [
        { id: "r1", name: "Founding Engineer", status: "PENDING", url: "https://www.paraform.com/client/r1" },
        { id: "r2", name: "Designer", status: "CLOSED_HIRED", url: "https://www.paraform.com/client/r2" },
      ],
    }));
    expect(await api.listRoles()).toEqual([
      { id: "r1", title: "Founding Engineer" },
      { id: "r2", title: "Designer" },
    ]);
  });

  it("refuses an answer in another shape instead of reading nothing", async () => {
    const { api } = fakeParaform(() => ({ items: [] }));
    await expect(api.listRoles()).rejects.toThrow(ParaformUnexpectedAnswerError);
  });
});

describe("listSubmissionIds", () => {
  it("asks for the role's open submissions and follows every page", async () => {
    const { api, calls } = fakeParaform((call) =>
      call.arguments.offset === 0
        ? { candidates: [{ applicationId: "a1" }, { applicationId: "a2" }], nextOffset: 2 }
        : { candidates: [{ applicationId: "a3" }], nextOffset: null },
    );
    expect(await api.listSubmissionIds("r1")).toEqual(["a1", "a2", "a3"]);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({
      name: "listHmCandidates",
      arguments: {
        roleId: "r1",
        status: ["SUBMITTED", "REVIEWED", "INTERVIEWING", "BACKBURNER", "OFFER"],
        offset: 0,
      },
    });
    expect(calls[1]?.arguments.offset).toBe(2);
  });

  it("gives up on a server that never stops paging", async () => {
    const { api } = fakeParaform(() => ({ candidates: [], nextOffset: 1 }));
    await expect(api.listSubmissionIds("r1")).rejects.toThrow(ParaformUnexpectedAnswerError);
  });
});

describe("getSubmission", () => {
  const answer = {
    applicationId: "a1",
    roleId: "r1",
    roleName: "Founding Engineer",
    name: "Ada L.",
    status: "SUBMITTED",
    submissionNotes: { openEnded: null, greatFitReason: " Built engines ", additionalInfo: "Can travel" },
    screeningAnswers: [],
    resumeText: "ADA LOVELACE ada@example.com",
    rejection: null,
    url: "https://www.paraform.com/client/r1?app_id=a1&source=mcp",
  };

  it("reads the fields the sync uses", async () => {
    const { api, calls } = fakeParaform(() => answer);
    expect(await api.getSubmission("a1")).toEqual({
      id: "a1",
      roleId: "r1",
      name: "Ada L.",
      resumeText: "ADA LOVELACE ada@example.com",
      note: "Built engines\n\nCan travel",
      url: "https://www.paraform.com/client/r1?app_id=a1&source=mcp",
    });
    expect(calls[0]).toEqual({ name: "getHmCandidate", arguments: { applicationId: "a1" } });
  });

  it("drops a link that is not on paraform.com", async () => {
    const { api } = fakeParaform(() => ({ ...answer, url: "javascript:alert(1)" }));
    expect((await api.getSubmission("a1")).url).toBeNull();
  });

  it("copes with no notes and no CV text", async () => {
    const { api } = fakeParaform(() => ({ ...answer, submissionNotes: null, resumeText: null }));
    expect(await api.getSubmission("a1")).toMatchObject({ note: null, resumeText: null });
  });
});

describe("paraformLink", () => {
  it("keeps https links on paraform.com and its subdomains only", () => {
    expect(paraformLink("https://paraform.com/x")).toBe("https://paraform.com/x");
    expect(paraformLink("https://www.paraform.com/x")).toBe("https://www.paraform.com/x");
    expect(paraformLink("http://www.paraform.com/x")).toBeNull();
    expect(paraformLink("https://paraform.com.evil.example/x")).toBeNull();
    expect(paraformLink("https://evilparaform.com/x")).toBeNull();
    expect(paraformLink("not a url")).toBeNull();
    expect(paraformLink(null)).toBeNull();
  });
});
