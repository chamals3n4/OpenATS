import { Router } from "express";
import { listNotes, createNote, updateNote, deleteNote } from "./candidate-notes.controller";
import multer from "multer";
import {
  applyForJob,
  getCandidates,
  getPipelineBoard,
  getCandidateById,
  getCandidateResume,
  getCandidateCvText,
  moveCandidateStage,
  deleteCandidate,
  bulkDeleteCandidates,
  bulkMoveCandidates,
  updateCandidateBasicDetails,
} from "./candidate.controller";

import { setCandidateRating } from "../scoring/scoring.controller";
import { requireCandidateView, requireJobView } from "../../middlewares/job-access.middleware";
import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// Adding an application from inside the dashboard. Applicants use /public/jobs/:jobId/apply, which
// has the origin check and its own limits; this one skips both, so it is for managers only.
router.post("/jobs/:jobId/apply", requireManager, requireJobView(), applyForJob);

router.get("/", getCandidates);
router.get("/jobs/:jobId/board", requireManager, requireJobView(), getPipelineBoard);
router.get("/jobs/:jobId", getCandidates);
router.get("/:id/notes", requireCandidateView("id"), listNotes);
router.post("/:id/notes", requireCandidateView("id"), createNote);
router.patch("/:id/notes/:noteId", requireCandidateView("id"), updateNote);
router.delete("/:id/notes/:noteId", requireCandidateView("id"), deleteNote);
router.get("/:id/resume", getCandidateResume);
router.get("/:id/cv-text", getCandidateCvText);
router.get("/:id", getCandidateById);
router.put("/:id/rating", requireCandidateView("id"), setCandidateRating);
router.patch("/:id", requireManager, requireCandidateView("id"), upload.single("resume"), updateCandidateBasicDetails);
// Before "/:id/stage", which would otherwise read "bulk" as an id.
router.put("/bulk/stage", requireManager, bulkMoveCandidates);
router.put("/:id/stage", requireManager, requireCandidateView("id"), moveCandidateStage);
router.delete("/bulk", requireManager, bulkDeleteCandidates);
router.delete("/:id", requireManager, requireCandidateView("id"), deleteCandidate);

export default router;
