import { Router } from "express";
import {
  applyForJob,
  getCandidates,
  getCandidateById,
  moveCandidateStage,
  deleteCandidate,
} from "../controllers/candidate.controller";

const router: Router = Router();

router.post("/jobs/:jobId/apply", applyForJob);

router.get("/jobs/:jobId", getCandidates);
router.get("/:id", getCandidateById);
router.put("/:id/stage", moveCandidateStage);
router.delete("/:id", deleteCandidate);

export default router
