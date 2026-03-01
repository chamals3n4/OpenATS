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

// jobs
router.get("/", getAllJobs);
router.post("/", createJob);
router.get("/slug/:slug", getJobBySlug);
router.get("/:id", getJobById);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

// pipeline stages
router.get("/:jobId/pipeline", getPipeline);
router.post("/:jobId/pipeline", createStage);
router.put("/:jobId/pipeline/:stageId", updateStage);
router.delete("/:jobId/pipeline/:stageId", deleteStage);

// hiring team
router.get("/:jobId/team", getHiringTeam);
router.post("/:jobId/team", addTeamMember);
router.delete("/:jobId/team/:userId", removeTeamMember);

// custom question + assessment attachment
router.use("/:jobId/questions", customQuestionRoutes);
router.use("/:jobId", customQuestionRoutes);

export default router;
