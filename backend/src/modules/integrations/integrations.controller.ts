import { Request, Response } from "express";
import { integrationConnectionService } from "../../shared/integrations/connection.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

export const getIntegrationStatus = async (req: Request, res: Response) => {
  try {
    const result = await integrationConnectionService.getStatus(req.user.id);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch integration status - user ${req.user?.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch integration status" });
  }
};

/** Lets a manager check whether a candidate interviewer has a provider connected, for the scheduling form. */
export const getUserIntegrationStatus = async (req: Request, res: Response) => {
  try {
    const userId = parseInt((req.params.userId ?? "").toString());
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    const result = await integrationConnectionService.getStatus(userId);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch integration status for user ${req.params.userId}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch integration status" });
  }
};

export const getGoogleAuthorizeUrl = async (req: Request, res: Response) => {
  try {
    const url = integrationConnectionService.getAuthUrl(req.user.id);
    res.status(200).json({ data: { url } });
  } catch (error) {
    logger.error(`Failed to build Google authorize URL - user ${req.user?.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to start Google connection" });
  }
};

export const disconnectGoogle = async (req: Request, res: Response) => {
  try {
    await integrationConnectionService.disconnect(req.user.id);
    logger.info(`Google integration disconnected by user ${req.user.id}`);
    res.status(200).json({ data: { disconnected: true } });
  } catch (error) {
    logger.error(`Failed to disconnect Google integration - user ${req.user?.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to disconnect" });
  }
};
