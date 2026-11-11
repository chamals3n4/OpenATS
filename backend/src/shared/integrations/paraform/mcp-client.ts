/**
 * A small client for one remote MCP server over Streamable HTTP: initialize once, then call tools.
 * It only does what the Paraform sync needs, so it has no notifications, resources or prompts.
 */

const PROTOCOL_VERSION = "2025-06-18";
const REQUEST_TIMEOUT_MS = 30_000;

/** The server refused the token. The caller refreshes it, or asks an admin to connect again. */
export class McpAuthError extends Error {
  constructor(message = "The MCP server refused the sign-in") {
    super(message);
    this.name = "McpAuthError";
  }
}

/** The server answered, but with an error for this request or tool call. */
export class McpCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpCallError";
  }
}

type JsonRpcResponse = {
  id?: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
};

/**
 * A response can be plain JSON or a server-sent event stream. In a stream, the answer is the
 * `data:` of the message that carries our request id.
 */
export function parseRpcBody(
  body: string,
  contentType: string | null,
  id: number,
): JsonRpcResponse {
  if (!contentType?.includes("text/event-stream")) {
    return JSON.parse(body) as JsonRpcResponse;
  }
  for (const event of body.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    const message = JSON.parse(data) as JsonRpcResponse;
    if (message.id === id) return message;
  }
  throw new McpCallError("The MCP server's stream ended without an answer");
}

/**
 * What a tool returned. Structured content is preferred; otherwise the first text block is read
 * as JSON, which is how most servers put data in a text-only result.
 */
export function toolResultData(result: unknown): unknown {
  const r = result as {
    isError?: boolean;
    structuredContent?: unknown;
    content?: Array<{ type: string; text?: string }>;
  };
  const text = r?.content?.find((c) => c.type === "text")?.text;
  if (r?.isError) throw new McpCallError(text || "The tool reported an error");
  if (r?.structuredContent !== undefined) return r.structuredContent;
  if (text === undefined) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class McpHttpClient {
  private nextId = 1;
  private sessionId: string | null = null;
  private initialized = false;

  constructor(
    private readonly url: string,
    private readonly getAccessToken: () => Promise<string>,
  ) {}

  private async post(
    payload: object,
    expectAnswer: boolean,
  ): Promise<JsonRpcResponse | null> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${await this.getAccessToken()}`,
      "mcp-protocol-version": PROTOCOL_VERSION,
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;

    const res = await fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await res.text();

    if (res.status === 401 || res.status === 403) {
      let description: string | undefined;
      try {
        description = (JSON.parse(body) as { error_description?: string })
          .error_description;
      } catch {
        description = undefined;
      }
      throw new McpAuthError(description);
    }
    if (!res.ok)
      throw new McpCallError(`The MCP server answered HTTP ${res.status}`);

    const session = res.headers.get("mcp-session-id");
    if (session) this.sessionId = session;
    if (!expectAnswer) return null;

    const message = parseRpcBody(
      body,
      res.headers.get("content-type"),
      (payload as { id: number }).id,
    );
    if (message.error) throw new McpCallError(message.error.message);
    return message;
  }

  private async request(method: string, params: object): Promise<unknown> {
    const id = this.nextId++;
    const message = await this.post(
      { jsonrpc: "2.0", id, method, params },
      true,
    );
    return message?.result;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "openats", version: "1" },
    });
    await this.post(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      false,
    );
    this.initialized = true;
  }

  async callTool(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    await this.ensureInitialized();
    return toolResultData(
      await this.request("tools/call", { name, arguments: args }),
    );
  }
}
