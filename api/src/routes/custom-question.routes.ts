import { Router } from "express";
import {
  getCustomQuestions,
  createCustomQuestion,
  updateCustomQuestion,
  deleteCustomQuestion,
  getAssessmentAttachment,
  attachAssessment,
  detachAssessment,
} from "../controllers/custom-question.controller";


const router:Router = Router({ mergeParams: true });


router.get("/", getCustomQuestions);
router.post("/", createCustomQuestion);
router.put("/:questionId", updateCustomQuestion);
router.delete("/:questionId", deleteCustomQuestion);


router.get("/assessment-attachment", getAssessmentAttachment);
router.post("/assessment-attachment", attachAssessment);
router.delete("/assessment-attachment/:stageId", detachAssessment);

export default router;
