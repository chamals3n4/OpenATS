import { Request, Response } from "express";
import { z } from "zod";
import { hiringTeamService } from "../services/hiring-team.service";
import { jobService } from "../services/job.service";


const addMemberSchema = z.object({
  userId: z.number().int().positive("User ID is required"),
});


export const getHiringTeam = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await jobService.getById(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const members = await hiringTeamService.getByJobId(jobId);
    res.status(200).json({ data: members });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hiring team" });
  }
};

export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await jobService.getById(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    // check if already a member before inserting
    const alreadyMember = await hiringTeamService.isMember(
      jobId,
      parsed.data.userId,
    );
    if (alreadyMember) {
      res.status(409).json({ error: "User is already on the hiring team" });
      return;
    }

    const result = await hiringTeamService.add(jobId, parsed.data.userId);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(400).json({ error: "User not found" });
      return;
    }
    res.status(500).json({ error: "Failed to add team member" });
  }
};

export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    const userId = parseInt((req.params.userId ?? "").toString());
    if (isNaN(jobId) || isNaN(userId)) {
      res.status(400).json({ error: "Invalid job ID or user ID" });
      return;
    }

    const job = await jobService.getById(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    if (job.createdBy === userId) {
      res.status(403).json({
        error: "Cannot remove the job creator from the hiring team",
      });
      return;
    }

    const result = await hiringTeamService.remove(jobId, userId);
    if (!result) {
      res.status(404).json({ error: "User is not on this job's hiring team" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove team member" });
  }
};
