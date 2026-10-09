import type { Request, Response } from "express";
import { z } from "zod";
import { aiSettingsService, GeminiNotConfiguredError } from "./ai-settings.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

const bodySchema = z.object({ cvAnalysisEnabled: z.boolean() });

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
      res.status(400).json({ error: "cvAnalysisEnabled must be true or false" });
      return;
    }
    const data = await aiSettingsService.setCvAnalysisEnabled(parsed.data.cvAnalysisEnabled);
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
