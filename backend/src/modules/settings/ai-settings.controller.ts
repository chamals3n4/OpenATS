import { listAiModels } from "../candidate/ai-models";
import { generateAiText } from "../candidate/ai-provider";
import type { Request, Response } from "express";
import { z } from "zod";
import { aiSettingsService, GeminiNotConfiguredError } from "./ai-settings.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

const bodySchema = z.union([
  z.object({ cvAnalysisEnabled: z.boolean() }).strict(),
  z.object({ provider: z.enum(["gemini", "openai", "anthropic", "grok"]), apiKey: z.string().trim().min(1).max(4096).optional() }).strict(),
]);

export async function getAiSettings(_req: Request, res: Response) {
  try {
    res.status(200).json({ data: await aiSettingsService.get() });
  } catch (error) {
    logger.error(`Failed to load AI settings: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to load AI settings" });
  }
}

export async function putAiSettings(req: Request, res: Response) {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid AI settings" });
      return;
    }
    const data = "provider" in parsed.data
      ? await aiSettingsService.setProvider(parsed.data.provider, parsed.data.apiKey)
      : await aiSettingsService.setCvAnalysisEnabled(parsed.data.cvAnalysisEnabled);
    logger.info(`AI CV analysis turned ${data.cvAnalysisEnabled ? "on" : "off"} by user ${req.user?.id}`);
    res.status(200).json({ data });
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) {
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error(`Failed to update AI settings - user ${req.user?.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to update AI settings" });
  }
}

export async function deleteAiProvider(req: Request, res: Response) {
  try {
    const data = await aiSettingsService.removeProvider();
    logger.info(`AI provider removed by user ${req.user?.id}`);
    res.status(200).json({ data });
  } catch (error) {
    logger.error(`Failed to remove AI provider - user ${req.user?.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to remove AI provider" });
  }
}

/** Test the saved provider and model without sending candidate data. */
export async function testAiProvider(_req: Request, res: Response) {
  try {
    const credentials = await aiSettingsService.credentials();
    const result = await generateAiText("Reply with a short greeting.", undefined, credentials);
    if (!result.trim()) throw new Error("Empty response");
    res.status(200).json({ data: { connected: true } });
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) {
      res.status(400).json({ error: error.message });
      return;
    }
    // Provider errors may contain sensitive information. Do not log or return their text.
    logger.warn("AI provider connection test failed");
    res.status(502).json({ error: "Connection failed. Check the API key, model, and provider account, then try again." });
  }
}

export async function getAiModels(_req: Request, res: Response) {
  try {
    const { provider, apiKey } = await aiSettingsService.credentials();
    const models = await listAiModels(provider, apiKey);
    res.status(200).json({ data: models });
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) { res.status(400).json({ error: error.message }); return; }
    logger.warn("Could not load AI provider models");
    res.status(502).json({ error: "Could not load models. Check the provider key and try again." });
  }
}

export async function putAiModel(req: Request, res: Response) {
  const parsed = z.object({ model: z.string().min(1).max(200) }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Select a valid model" }); return; }
  try {
    const { provider, apiKey } = await aiSettingsService.credentials();
    const models = await listAiModels(provider, apiKey);
    if (!models.some((model) => model.id === parsed.data.model && model.lifecycle !== "deprecated")) {
      res.status(400).json({ error: "This model is not available for selection. Refresh the model list." }); return;
    }
    const data = await aiSettingsService.setModel(parsed.data.model);
    res.status(200).json({ data });
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) { res.status(400).json({ error: error.message }); return; }
    logger.warn("Could not save AI model");
    res.status(502).json({ error: "Could not verify the model. Check the provider connection and try again." });
  }
}
