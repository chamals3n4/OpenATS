import { NextFunction, Request, Response } from "express";
import {
  canAccessCandidate,
  canAccessJob,
  canViewCandidate,
  canViewInterview,
  canViewJob,
  parseRoomId,
} from "../shared/auth/job-access";
import logger from "../utils/logger";

// HTTP guards for the two rules in shared/auth/job-access.ts. Mount after `authMiddleware`.
//   requireJobView / requireCandidateView: the data. Managers and admins pass for every job,
//     interviewers only for their own. Use these for anything about a candidate or a job.
//   requireJobAccess / requireCandidateAccess: the team chat. Hiring team members only.

function deny(res: Response, userId: number, what: string) {
  logger.warn(`[access] user ${userId} denied ${what}`);
  res.status(403).json({ error: "You do not have access to this resource" });
}

type Rule = (user: Request["user"], id: number) => Promise<boolean>;

function jobGuard(rule: Rule, param: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const jobId = parseRoomId(req.params[param]);
    if (jobId === null) {
      res.status(400).json({ error: "Invalid job id" });
      return;
    }

    try {
      if (!(await rule(req.user, jobId))) {
        deny(res, req.user.id, `job ${jobId}`);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

function candidateGuard(rule: Rule, param: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const candidateId = parseRoomId(req.params[param]);
    if (candidateId === null) {
      res.status(400).json({ error: "Invalid candidate id" });
      return;
    }

    try {
      if (!(await rule(req.user, candidateId))) {
        deny(res, req.user.id, `candidate ${candidateId}`);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireJobView = (param = "jobId") => jobGuard(canViewJob, param);
export const requireCandidateView = (param = "candidateId") => candidateGuard(canViewCandidate, param);

export const requireJobAccess = (param = "jobId") => jobGuard(canAccessJob, param);
export const requireCandidateAccess = (param = "candidateId") => candidateGuard(canAccessCandidate, param);

/** For routes about one interview. An interviewer passes for their own jobs and for interviews assigned to them. */
export function requireInterviewView(param = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const interviewId = parseRoomId(req.params[param]);
    if (interviewId === null) {
      res.status(400).json({ error: "Invalid interview id" });
      return;
    }

    try {
      if (!(await canViewInterview(req.user, interviewId))) {
        deny(res, req.user.id, `interview ${interviewId}`);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
