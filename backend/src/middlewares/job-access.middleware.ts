import { NextFunction, Request, Response } from "express";
import {
  canAccessCandidate,
  canAccessJob,
  parseRoomId,
} from "../shared/auth/job-access";
import logger from "../utils/logger";

// HTTP version of the socket room guards. Mount after `authMiddleware`.

function deny(res: Response, userId: number, what: string) {
  logger.warn(`[access] user ${userId} denied ${what}`);
  res.status(403).json({ error: "You do not have access to this resource" });
}

export function requireJobAccess(param = "jobId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const jobId = parseRoomId(req.params[param]);
    if (jobId === null) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }

    try {
      if (!(await canAccessJob(req.user, jobId))) {
        deny(res, req.user.id, `job ${jobId}`);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireCandidateAccess(param = "candidateId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const candidateId = parseRoomId(req.params[param]);
    if (candidateId === null) {
      res.status(400).json({ error: "Invalid candidate id" });
      return;
    }

    try {
      if (!(await canAccessCandidate(req.user, candidateId))) {
        deny(res, req.user.id, `candidate ${candidateId}`);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
