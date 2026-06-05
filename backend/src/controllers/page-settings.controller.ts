import type { Request, Response } from "express";
import { z } from "zod";
import { pageSettingsService } from "../services/page-settings.service";
import logger from "../utils/logger";

const originsBodySchema = z.object({
  origins: z.array(z.string().min(1).max(500)).max(50),
});

export async function getAllowedOrigins(_req: Request, res: Response) {
  try {
    const origins = await pageSettingsService.getAllowedOrigins();
    res.status(200).json({ data: { origins } });
  } catch (error) {
    logger.error(`Failed to load allowed origins: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to load allowed origins" });
  }
}

export async function putAllowedOrigins(req: Request, res: Response) {
  try {
    const parsed = originsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(`Allowed origins update validation failed - user ${req.user?.id}: ${JSON.stringify(parsed.error.flatten())}`);
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
      return;
    }

    const origins = await pageSettingsService.setAllowedOrigins(
      parsed.data.origins,
    );
    logger.info(`Allowed origins updated: count=${origins.length} by user ${req.user?.id}`);
    res.status(200).json({ data: { origins } });
  } catch (error) {
    logger.error(`Failed to update allowed origins - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to update allowed origins" });
  }
}
