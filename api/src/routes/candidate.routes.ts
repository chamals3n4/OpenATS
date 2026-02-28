import { Router } from "express";
import {
  applyForJob,
  getCandidates,
  getCandidateById,
  moveCandidateStage,
  deleteCandidate,
} from "../controllers/candidate.controller";

const router: Router = Router();

// Public implementation (the actual career page application)
// POST /api/candidates/jobs/:jobId/apply
router.post("/jobs/:jobId/apply", applyForJob);

// Admin implementation
// GET /api/candidates/jobs/:jobId
router.get("/jobs/:jobId", getCandidates);

// GET /api/candidates/:id
router.get("/:id", getCandidateById);

// PUT /api/candidates/:id/stage
router.put("/:id/stage", moveCandidateStage);

// DELETE /api/candidates/:id
router.delete("/:id", deleteCandidate);

export default router;
