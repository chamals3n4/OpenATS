import { Router } from "express";
import {
  getAllJobs,
  getJobById,
  getJobBySlug,
  createJob,
  updateJob,
  deleteJob,
  bulkDeleteJobs,
  getAssessments,
  attachAssessment,
  detachAssessment,
} from "../controllers/job.controller";
import {
  getPipeline,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
} from "../controllers/pipeline.controller";
import {
  getHiringTeam,
  addTeamMember,
  removeTeamMember,
} from "../controllers/hiring-team.controller";
import customQuestionRoutes from "./custom-question.routes";

const router: Router = Router();

// jobs
router.get("/", getAllJobs);
router.post("/", createJob);
router.delete("/bulk", bulkDeleteJobs);
router.get("/slug/:slug", getJobBySlug);
router.get("/:id", getJobById);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

// pipeline stages
router.get("/:jobId/pipeline", getPipeline);
router.post("/:jobId/pipeline", createStage);
router.post("/:jobId/pipeline/reorder", reorderStages);
router.put("/:jobId/pipeline/:stageId", updateStage);
router.delete("/:jobId/pipeline/:stageId", deleteStage);

// hiring team
router.get("/:jobId/team", getHiringTeam);
router.post("/:jobId/team", addTeamMember);
router.delete("/:jobId/team/:userId", removeTeamMember);

// assessments tab
router.get("/:id/assessments", getAssessments);
router.post("/:id/assessments", attachAssessment);
router.delete("/:id/assessments/:attachmentId", detachAssessment);

// custom question + assessment attachment
router.use("/:jobId/questions", customQuestionRoutes);

export default router;
