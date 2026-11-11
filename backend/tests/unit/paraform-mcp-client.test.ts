import { afterEach, describe, expect, it, vi } from "vitest";
import {
  McpAuthError,
  McpCallError,
  McpHttpClient,
  parseRpcBody,
  toolResultData,
} from "../../src/shared/integrations/paraform/mcp-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseRpcBody", () => {
  it("reads plain JSON", () => {
    expect(parseRpcBody('{"id":1,"result":{"ok":true}}', "application/json", 1)).toEqual({
      id: 1,
      result: { ok: true },
    });
  });

  it("finds our answer in an event stream, past other messages", () => {
    const body = 'event: message\ndata: {"method":"notifications/progress"}\n\nevent: message\ndata: {"id":2,"result":{"ok":true}}\n\n';
    expect(parseRpcBody(body, "text/event-stream", 2).result).toEqual({ ok: true });
  });

  it("fails when the stream never answers", () => {
    expect(() => parseRpcBody("data: {}\n\n", "text/event-stream", 9)).toThrow(McpCallError);
  });
});

describe("toolResultData", () => {
  it("prefers structured content", () => {
    expect(toolResultData({ structuredContent: { a: 1 }, content: [{ type: "text", text: "x" }] })).toEqual({ a: 1 });
  });

  it("reads JSON from the first text block", () => {
    expect(toolResultData({ content: [{ type: "text", text: '{"a":2}' }] })).toEqual({ a: 2 });
  });

  it("throws the tool's own message when it reports an error", () => {
    expect(() => toolResultData({ isError: true, content: [{ type: "text", text: "nope" }] })).toThrow("nope");
  });
});

describe("McpHttpClient", () => {
  function reply(status: number, body: object, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    });
  }

  it("initializes once, keeps the session, and sends the token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(200, { id: 1, result: {} }, { "mcp-session-id": "s1" }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(reply(200, { id: 2, result: { structuredContent: { roles: [] } } }))
      .mockResolvedValueOnce(reply(200, { id: 3, result: { structuredContent: { roles: [1] } } }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new McpHttpClient("https://mcp.example/mcp", async () => "tok");
    expect(await client.callTool("listHmRoles")).toEqual({ roles: [] });
    expect(await client.callTool("listHmRoles")).toEqual({ roles: [1] });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const methods = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).method);
    expect(methods).toEqual(["initialize", "notifications/initialized", "tools/call", "tools/call"]);
    const last = fetchMock.mock.calls[3]![1];
    expect(last.headers.authorization).toBe("Bearer tok");
    expect(last.headers["mcp-session-id"]).toBe("s1");
  });

  it("turns Paraform's 403 into an auth error with its reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () =>
        reply(403, { error: "access_denied", error_description: "This account has no HM or recruiter MCP access" }),
      ),
    );
    const client = new McpHttpClient("https://mcp.example/mcp", async () => "tok");
    await expect(client.callTool("getIdentity")).rejects.toThrow(McpAuthError);
    await expect(client.callTool("getIdentity")).rejects.toThrow("no HM or recruiter MCP access");
  });
});
