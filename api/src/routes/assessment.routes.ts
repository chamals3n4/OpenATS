import { Router } from "express";
import {
  getAllAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../controllers/assessment.controller";

const router:Router = Router();

// ── Assessments ───────────────────────────────────────────────────────────────
// GET    /api/assessments          → list all assessments
// POST   /api/assessments          → create (optionally with questions)
// GET    /api/assessments/:id      → get with questions + options
// PUT    /api/assessments/:id      → update title/description/timeLimit/passScore
// DELETE /api/assessments/:id      → delete
router.get("/", getAllAssessments);
router.post("/", createAssessment);
router.get("/:id", getAssessmentById);
router.put("/:id", updateAssessment);
router.delete("/:id", deleteAssessment);

// ── Questions ─────────────────────────────────────────────────────────────────
// POST   /api/assessments/:id/questions                → add a question
// PUT    /api/assessments/:id/questions/:questionId    → update a question
// DELETE /api/assessments/:id/questions/:questionId    → delete a question
router.post("/:id/questions", createQuestion);
router.put("/:id/questions/:questionId", updateQuestion);
router.delete("/:id/questions/:questionId", deleteQuestion);

export default router;
