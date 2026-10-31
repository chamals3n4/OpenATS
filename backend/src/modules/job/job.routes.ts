import { Router } from "express";
import {
  getAllJobs,
  getJobById,
  getJobBySlug,
  createJob,
  updateJob,
  deleteJob,
  getJobDeleteSummary,
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
router.get("/delete-summary", requireManager, getJobDeleteSummary);
router.get("/slug/:slug", getJobBySlug);
router.get("/:id", getJobById);
router.put("/:id", requireManager, requireJobView("id"), updateJob);
router.delete("/:id", requireManager, requireJobView("id"), deleteJob);

// What a job is made of is read under the same rule as the job itself: an interviewer only for
// the jobs they are on.
router.get("/:jobId/pipeline", requireJobView(), getPipeline);
router.post("/:jobId/pipeline", requireManager, requireJobView(), createStage);
router.post("/:jobId/pipeline/reorder", requireManager, requireJobView(), reorderStages);
router.put("/:jobId/pipeline/:stageId", requireManager, requireJobView(), updateStage);
router.delete("/:jobId/pipeline/:stageId", requireManager, requireJobView(), deleteStage);

router.get("/:jobId/team", requireJobView(), getHiringTeam);
router.post("/:jobId/team", requireManager, requireJobView(), addTeamMember);
router.delete("/:jobId/team/:userId", requireManager, requireJobView(), removeTeamMember);

router.get("/:id/assessments", requireJobView("id"), getAssessments);
router.post("/:id/assessments", requireManager, requireJobView("id"), attachAssessment);
router.patch("/:id/assessments/:attachmentId", requireManager, requireJobView("id"), updateAssessmentPassMark);
router.delete("/:id/assessments/:attachmentId", requireManager, requireJobView("id"), detachAssessment);

router.get("/:jobId/scorecard", requireJobView(), getScorecard);
router.put("/:jobId/scorecard", requireManager, requireJobView(), putScorecard);

router.use("/:jobId/questions", customQuestionRoutes);

export default router;
