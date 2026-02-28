import { Router } from "express";
import {
  getAllJobs,
  getJobById,
  getJobBySlug,
  createJob,
  updateJob,
  deleteJob,
} from "../controllers/job.controller";
import {
  getPipeline,
  createStage,
  updateStage,
  deleteStage,
} from "../controllers/pipeline.controller";
import {
  getHiringTeam,
  addTeamMember,
  removeTeamMember,
} from "../controllers/hiring-team.controller";
import customQuestionRoutes from "./custom-question.routes";

const router: Router = Router();

// ── Jobs ──────────────────────────────────────────────────────────────────────
// GET    /api/jobs               → list all jobs
// POST   /api/jobs               → create a job
// GET    /api/jobs/slug/:slug    → get job by slug (public preview)
// GET    /api/jobs/:id           → get job by ID
// PUT    /api/jobs/:id           → update a job
// DELETE /api/jobs/:id           → delete a job
router.get("/", getAllJobs);
router.post("/", createJob);
router.get("/slug/:slug", getJobBySlug);
router.get("/:id", getJobById);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

// ── Pipeline Stages ───────────────────────────────────────────────────────────
// GET    /api/jobs/:jobId/pipeline                    → get all stages for a job
// POST   /api/jobs/:jobId/pipeline                    → add a custom stage
// PUT    /api/jobs/:jobId/pipeline/:stageId           → update a stage
// DELETE /api/jobs/:jobId/pipeline/:stageId           → delete a stage
router.get("/:jobId/pipeline", getPipeline);
router.post("/:jobId/pipeline", createStage);
router.put("/:jobId/pipeline/:stageId", updateStage);
router.delete("/:jobId/pipeline/:stageId", deleteStage);

// ── Hiring Team ───────────────────────────────────────────────────────────────
// GET    /api/jobs/:jobId/team              → get hiring team members
// POST   /api/jobs/:jobId/team              → add a member
// DELETE /api/jobs/:jobId/team/:userId      → remove a member
router.get("/:jobId/team", getHiringTeam);
router.post("/:jobId/team", addTeamMember);
router.delete("/:jobId/team/:userId", removeTeamMember);

// ── Custom Questions + Assessment Attachment ──────────────────────────────────
// mergeParams: true is set in custom-question.routes.ts so :jobId is available
router.use("/:jobId/questions", customQuestionRoutes);
router.use("/:jobId", customQuestionRoutes);

export default router;
