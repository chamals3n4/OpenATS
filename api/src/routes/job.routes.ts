import { Router } from "express";
import {
  getAllJobs,
  getJobById,
  getJobBySlug,
  createJob,
  updateJob,
  deleteJob,
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
import {
  requireAnyRole,
  requireJobManageAccess,
  requireJobReadAccess,
} from "../middlewares/rbac.middleware";

const router: Router = Router();

// jobs
router.get("/", getAllJobs);
router.post("/", requireAnyRole("super_admin", "hiring_manager"), createJob);
router.get("/slug/:slug", getJobBySlug);
router.get("/:id", requireJobReadAccess("id"), getJobById);
router.put("/:id", requireJobManageAccess("id"), updateJob);
router.delete("/:id", requireJobManageAccess("id"), deleteJob);

// pipeline stages
router.get("/:jobId/pipeline", requireJobReadAccess("jobId"), getPipeline);
router.post("/:jobId/pipeline", requireJobManageAccess("jobId"), createStage);
router.post(
  "/:jobId/pipeline/reorder",
  requireJobManageAccess("jobId"),
  reorderStages,
);
router.put("/:jobId/pipeline/:stageId", requireJobManageAccess("jobId"), updateStage);
router.delete(
  "/:jobId/pipeline/:stageId",
  requireJobManageAccess("jobId"),
  deleteStage,
);

// hiring team
router.get("/:jobId/team", requireJobReadAccess("jobId"), getHiringTeam);
router.post("/:jobId/team", requireJobManageAccess("jobId"), addTeamMember);
router.delete(
  "/:jobId/team/:userId",
  requireJobManageAccess("jobId"),
  removeTeamMember,
);

// assessments tab
router.get("/:id/assessments", requireJobReadAccess("id"), getAssessments);
router.post("/:id/assessments", requireJobManageAccess("id"), attachAssessment);
router.delete(
  "/:id/assessments/:attachmentId",
  requireJobManageAccess("id"),
  detachAssessment,
);

// custom question + assessment attachment
router.use("/:jobId/questions", requireJobManageAccess("jobId"), customQuestionRoutes);

export default router;
