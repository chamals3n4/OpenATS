import type { AiProvider } from "./ai-provider";

export interface AiModel { id: string; name: string; lifecycle: "active" | "deprecated" | "unknown" }

/** Provider catalogues are fetched with the installation's key; no candidate data is sent. */
export async function listAiModels(provider: AiProvider, apiKey: string): Promise<AiModel[]> {
  const headers: Record<string, string> = provider === "anthropic"
    ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
    : provider === "gemini" ? { "x-goog-api-key": apiKey } : { authorization: `Bearer ${apiKey}` };
  const base = provider === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000"
    : provider === "anthropic" ? "https://api.anthropic.com/v1/models?limit=1000"
      : provider === "grok" ? "https://api.x.ai/v1/language-models" : "https://api.openai.com/v1/models";
  let cursor: string | undefined;
  const models: AiModel[] = [];
  for (let page = 0; page < 20; page++) {
    const url = new URL(base);
    if (cursor) url.searchParams.set(provider === "gemini" ? "pageToken" : "after_id", cursor);
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("Could not load provider models");
    const body = await response.json() as { data?: Record<string, unknown>[]; models?: Record<string, unknown>[]; nextPageToken?: string; has_more?: boolean; last_id?: string };
    const entries = provider === "gemini" || provider === "grok" ? body.models : body.data;
    if (!Array.isArray(entries)) throw new Error("Invalid provider model list");
    for (const item of entries) {
      const raw = provider === "gemini" ? item.name : item.id;
      if (typeof raw !== "string") continue;
      const id = raw.replace(/^models\//, "");
      const methods = item.supportedGenerationMethods;
      // Restrict to model families this integration can use for text generation. Model lists alone
      // do not prove account access or announce every future deprecation; the test checks inference.
      const usable = provider === "gemini" ? /^gemini-/.test(id) && Array.isArray(methods) && methods.includes("generateContent") && !/image|audio|tts|speech|robotics/i.test(id)
        : provider === "openai" ? /^gpt-(?:4o|4\.1|[5-9](?:\.\d+)?)(?:-|$)/.test(id) && !/(?:audio|realtime|transcrib|search|image|tts|codex|computer|embedding|moderation|(?:^|-)pro(?:-|$))/i.test(id)
          : provider === "anthropic" ? /^claude-/.test(id) : /^grok-/.test(id);
      if (!usable) continue;
      const lifecycle = item.lifecycle === "deprecated" || item.lifecycle === "retired" || item.deprecated_at ? "deprecated" : item.lifecycle === "active" ? "active" : "unknown";
      const label = item.display_name ?? item.displayName ?? id;
      models.push({ id, name: typeof label === "string" ? label : id, lifecycle });
    }
    const next = provider === "gemini" ? body.nextPageToken : provider === "anthropic" && body.has_more ? body.last_id : undefined;
    if (!next) return models;
    if (next === cursor) throw new Error("Invalid provider model pagination");
    cursor = next;
  }
  throw new Error("Provider model list is incomplete");
}
