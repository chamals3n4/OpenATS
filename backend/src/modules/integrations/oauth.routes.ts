import { Router, Request, Response } from "express";
import { integrationConnectionService } from "../../shared/integrations/connection.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

const router: Router = Router();

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

function frontendUrl(): string {
  return normalizeOrigin(process.env.FRONTEND_URL ?? "http://localhost:3000");
}

router.get("/google/callback", async (req: Request, res: Response) => {
  const { code, state, error: providerError } = req.query;

  if (providerError || typeof code !== "string" || typeof state !== "string") {
    res.redirect(`${frontendUrl()}/settings/integrations?error=google_meet`);
    return;
  }

  try {
    await integrationConnectionService.handleCallback(code, state);
    res.redirect(`${frontendUrl()}/settings/integrations?connected=google_meet`);
  } catch (error) {
    logger.error(`Google OAuth callback failed: ${getErrorMessage(error)}`);
    res.redirect(`${frontendUrl()}/settings/integrations?error=google_meet`);
  }
});

export default router;
