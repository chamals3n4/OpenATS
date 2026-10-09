import { Router } from "express";
import multer from "multer";
import {
  applyForJob,
  getCandidates,
  getPipelineBoard,
  getCandidateById,
  getCandidateResume,
  moveCandidateStage,
  deleteCandidate,
  bulkDeleteCandidates,
  bulkMoveCandidates,
  updateCandidateBasicDetails,
} from "./candidate.controller";

import { setCandidateRating } from "../scoring/scoring.controller";
import { requireCandidateAccess } from "../../middlewares/job-access.middleware";
import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/jobs/:jobId/apply", applyForJob);

router.get("/", getCandidates);
router.get("/jobs/:jobId/board", requireManager, getPipelineBoard);
router.get("/jobs/:jobId", getCandidates);
router.get("/:id/resume", getCandidateResume);
router.get("/:id", getCandidateById);
router.put("/:id/rating", requireCandidateAccess("id"), setCandidateRating);
router.patch("/:id", requireManager, upload.single("resume"), updateCandidateBasicDetails);
// Before "/:id/stage", which would otherwise read "bulk" as an id.
router.put("/bulk/stage", requireManager, bulkMoveCandidates);
router.put("/:id/stage", requireManager, moveCandidateStage);
router.delete("/bulk", requireManager, bulkDeleteCandidates);
router.delete("/:id", requireManager, deleteCandidate);

export default router;
