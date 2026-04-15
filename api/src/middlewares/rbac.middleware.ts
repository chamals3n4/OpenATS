import { NextFunction, Request, Response } from "express";
import { jobService } from "../services/job.service";
import { hiringTeamService } from "../services/hiring-team.service";

type AppRole = "super_admin" | "hiring_manager" | "interviewer";

export function requireAnyRole(...allowed: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role as AppRole | undefined;
    if (!role || !allowed.includes(role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

async function hasJobReadAccess(userId: number, role: AppRole, jobId: number) {
  if (role === "super_admin") return true;

  const job = await jobService.getById(jobId);
  if (!job) return null;

  if (role === "hiring_manager" && job.createdBy === userId) return true;
  if (await hiringTeamService.isMember(jobId, userId)) return true;

  return false;
}

async function hasJobManageAccess(userId: number, role: AppRole, jobId: number) {
  if (role === "super_admin") return true;

  const job = await jobService.getById(jobId);
  if (!job) return null;

  if (role === "hiring_manager" && job.createdBy === userId) return true;
  return false;
}

function parseJobId(req: Request, paramName: string) {
  const raw = req.params[paramName];
  const jobId = Number(raw);
  return Number.isInteger(jobId) && jobId > 0 ? jobId : null;
}

export function requireJobReadAccess(paramName = "jobId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const role = user?.role as AppRole | undefined;
    if (!user || !role) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const jobId = parseJobId(req, paramName);
    if (!jobId) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const allowed = await hasJobReadAccess(user.id, role, jobId);
    if (allowed === null) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}

export function requireJobManageAccess(paramName = "jobId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const role = user?.role as AppRole | undefined;
    if (!user || !role) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const jobId = parseJobId(req, paramName);
    if (!jobId) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const allowed = await hasJobManageAccess(user.id, role, jobId);
    if (allowed === null) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
