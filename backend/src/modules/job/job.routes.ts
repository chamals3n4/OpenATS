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
  updateAssessmentPassMark,
} from "./job.controller";
import {
  getPipeline,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
} from "../pipeline/pipeline.controller";
import {
  getHiringTeam,
  addTeamMember,
  removeTeamMember,
} from "../hiring-team/hiring-team.controller";
import { getScorecard, putScorecard } from "../scoring/scoring.controller";
import customQuestionRoutes from "../custom-question/custom-question.routes";
import { requireJobView } from "../../middlewares/job-access.middleware";
import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.get("/", getAllJobs);
router.post("/", requireManager, createJob);
router.delete("/bulk", requireManager, bulkDeleteJobs);
router.get("/slug/:slug", getJobBySlug);
router.get("/:id", getJobById);
router.put("/:id", requireManager, updateJob);
router.delete("/:id", requireManager, deleteJob);

// What a job is made of is read under the same rule as the job itself: an interviewer only for
// the jobs they are on.
router.get("/:jobId/pipeline", requireJobView(), getPipeline);
router.post("/:jobId/pipeline", requireManager, createStage);
router.post("/:jobId/pipeline/reorder", requireManager, reorderStages);
router.put("/:jobId/pipeline/:stageId", requireManager, updateStage);
router.delete("/:jobId/pipeline/:stageId", requireManager, deleteStage);

router.get("/:jobId/team", requireJobView(), getHiringTeam);
router.post("/:jobId/team", requireManager, addTeamMember);
router.delete("/:jobId/team/:userId", requireManager, removeTeamMember);

router.get("/:id/assessments", requireJobView("id"), getAssessments);
router.post("/:id/assessments", requireManager, attachAssessment);
router.patch("/:id/assessments/:attachmentId", requireManager, updateAssessmentPassMark);
router.delete("/:id/assessments/:attachmentId", requireManager, detachAssessment);

router.get("/:jobId/scorecard", requireJobView(), getScorecard);
router.put("/:jobId/scorecard", requireManager, putScorecard);

router.use("/:jobId/questions", customQuestionRoutes);

export default router;
