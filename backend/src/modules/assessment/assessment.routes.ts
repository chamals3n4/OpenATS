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
} from "./assessment.controller";

import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.get("/", getAllAssessments);
router.post("/", requireManager, createAssessment);
router.get("/:id", getAssessmentById);
router.put("/:id", requireManager, updateAssessment);
router.delete("/:id", requireManager, deleteAssessment);

router.post("/:id/questions", requireManager, createQuestion);
router.put("/:id/questions/:questionId", requireManager, updateQuestion);
router.delete("/:id/questions/:questionId", requireManager, deleteQuestion);

export default router;
