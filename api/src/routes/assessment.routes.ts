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

// assessments
router.get("/", getAllAssessments);
router.post("/", createAssessment);
router.get("/:id", getAssessmentById);
router.put("/:id", updateAssessment);
router.delete("/:id", deleteAssessment);

// questions
router.post("/:id/questions", createQuestion);
router.put("/:id/questions/:questionId", updateQuestion);
router.delete("/:id/questions/:questionId", deleteQuestion);

export default router;
