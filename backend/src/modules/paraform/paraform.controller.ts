import type { Request, Response } from "express";
import { z } from "zod";
import { requestParaformSync } from "../../queues/paraform-sync/queue";
import { McpAuthError } from "../../shared/integrations/paraform/mcp-client";
import { ParaformUnexpectedAnswerError } from "../../shared/integrations/paraform/paraform-api";
import { getErrorMessage } from "../../utils/error.utils";
import logger from "../../utils/logger";
import {
  paraformConnectionService,
  ParaformNotConnectedError,
} from "./paraform-connection.service";
import { paraformSyncService } from "./paraform-sync.service";
import { paraformService, RoleLinkConflictError } from "./paraform.service";

const linkSchema = z.object({
  paraformRoleId: z.string().trim().min(1).max(255),
  paraformRoleTitle: z.string().trim().min(1).max(255),
  jobId: z.number().int().positive(),
});

export async function getOverview(_req: Request, res: Response) {
  try {
    res.status(200).json({ data: await paraformService.overview() });
  } catch (error) {
    logger.error(`Failed to load Paraform settings: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to load Paraform settings" });
  }
}

/** Asks Paraform whether this account may use the hiring-manager tools. */
export async function getAccess(_req: Request, res: Response) {
  try {
    res
      .status(200)
      .json({
        data: { access: await paraformConnectionService.checkAccess() },
      });
  } catch (error) {
    if (error instanceof ParaformNotConnectedError) {
      res.status(409).json({ error: error.message });
      return;
    }
    logger.error(`Failed to check Paraform access: ${getErrorMessage(error)}`);
    res
      .status(502)
      .json({ error: "Couldn't reach Paraform. Try again in a minute." });
  }
}

export async function getConnectUrl(req: Request, res: Response) {
  try {
    res
      .status(200)
      .json({
        data: { url: await paraformConnectionService.getAuthUrl(req.user.id) },
      });
  } catch (error) {
    logger.error(
      `Failed to start Paraform connection - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res
      .status(502)
      .json({
        error: "Couldn't reach Paraform to start the connection. Try again.",
      });
  }
}

export async function disconnect(req: Request, res: Response) {
  try {
    await paraformConnectionService.disconnect();
    logger.info(`Paraform disconnected by user ${req.user.id}`);
    res.status(200).json({ data: { disconnected: true } });
  } catch (error) {
    logger.error(
      `Failed to disconnect Paraform - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to disconnect Paraform" });
  }
}

/** The company's roles, read live from Paraform, for linking to jobs. */
export async function listRoles(_req: Request, res: Response) {
  try {
    res
      .status(200)
      .json({ data: await paraformConnectionService.api().listRoles() });
  } catch (error) {
    if (error instanceof ParaformNotConnectedError) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof McpAuthError) {
      res
        .status(409)
        .json({
          error:
            "Paraform hasn't given this account hiring-manager access yet.",
        });
      return;
    }
    if (error instanceof ParaformUnexpectedAnswerError) {
      logger.error(`Failed to list Paraform roles: ${error.message}`);
      res.status(502).json({
        error:
          "Paraform answered in a form this version of OpenATS doesn't read.",
      });
      return;
    }
    logger.error(`Failed to list Paraform roles: ${getErrorMessage(error)}`);
    res
      .status(502)
      .json({
        error: "Couldn't load roles from Paraform. Try again in a minute.",
      });
  }
}

export async function linkRole(req: Request, res: Response) {
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a Paraform role and a job" });
    return;
  }
  try {
    const link = await paraformService.linkRole(parsed.data, req.user.id);
    res.status(201).json({ data: link });
  } catch (error) {
    if (error instanceof RoleLinkConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    logger.error(
      `Failed to link Paraform role - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to link the role" });
  }
}

export async function unlinkRole(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid link ID" });
    return;
  }
  try {
    if (!(await paraformService.unlinkRole(id))) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.status(200).json({ data: { unlinked: true } });
  } catch (error) {
    logger.error(
      `Failed to unlink Paraform role ${id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to unlink the role" });
  }
}

export async function syncNow(req: Request, res: Response) {
  if (!(await requestParaformSync())) {
    res
      .status(503)
      .json({
        error:
          "The background worker can't be reached, so the sync wasn't started.",
      });
    return;
  }
  logger.info(`Paraform sync requested by user ${req.user.id}`);
  res.status(202).json({ data: { queued: true } });
}

export async function listRuns(_req: Request, res: Response) {
  try {
    res.status(200).json({ data: await paraformSyncService.recentRuns() });
  } catch (error) {
    logger.error(`Failed to load Paraform sync log: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to load the sync log" });
  }
}
