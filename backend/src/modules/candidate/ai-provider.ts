import { GoogleGenAI } from "@google/genai";
import { extractCvTextWithTimeout } from "./cv-text/extract-with-timeout";

export type AiProvider = "gemini" | "openai" | "anthropic" | "grok";
const keys: Record<AiProvider, string> = { gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", grok: "XAI_API_KEY" };
const models: Record<AiProvider, string> = { gemini: "gemini-3-flash-preview", openai: "gpt-4o-mini", anthropic: "claude-sonnet-4-5", grok: "grok-4-1-fast-reasoning" };

export function selectedAiProvider(): AiProvider {
  const provider = process.env.AI_CV_PROVIDER || "gemini";
  if (!Object.hasOwn(keys, provider)) throw new Error("Invalid AI_CV_PROVIDER");
  return provider as AiProvider;
}
export function providerConfigured(provider = selectedAiProvider()): boolean {
  return !!process.env[keys[provider]]?.trim();
}

export function defaultAiModel(provider: AiProvider): string {
  return process.env.AI_CV_MODEL?.trim() || models[provider];
}

/** Send only to the explicitly configured provider; never fall back to another service. */
export function environmentApiKey(provider: AiProvider): string | undefined {
  return process.env[keys[provider]]?.trim() || undefined;
}

export async function generateAiText(prompt: string, pdf?: Buffer, configuration?: { provider: AiProvider; apiKey: string; model?: string }): Promise<string> {
  const provider = configuration?.provider ?? selectedAiProvider();
  const apiKey = configuration?.apiKey ?? environmentApiKey(provider);
  if (!apiKey) throw new Error(`${keys[provider]} is not set`);
  const model = configuration?.model || defaultAiModel(provider);
  if (provider === "gemini") {
    const response = await new GoogleGenAI({ apiKey }).models.generateContent({
      model, contents: [{ text: prompt }, ...(pdf ? [{ inlineData: { mimeType: "application/pdf", data: pdf.toString("base64") } }] : [])],
      config: { httpOptions: { timeout: 30_000 } },
    });
    return response.text?.trim() ?? "";
  }
  if (pdf) {
    const extracted = await extractCvTextWithTimeout(pdf);
    if (extracted.status !== "done") throw new Error("The CV has no readable text for AI analysis");
    prompt += `\n\nCV TEXT:\n${extracted.text}`;
  }
  const anthropic = provider === "anthropic";
  const response = await fetch(anthropic ? "https://api.anthropic.com/v1/messages" : provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: anthropic ? { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" } : { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, ...(provider === "openai" ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }), messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`AI provider request failed (${response.status})`);
  const data = await response.json() as { content?: { type: string; text?: string }[]; choices?: { message?: { content?: string } }[] };
  const text = anthropic ? data.content?.filter(part => part.type === "text").map(part => part.text ?? "").join("") : data.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error("AI provider returned an empty response");
  return text.trim();
}
