import { Router } from "express";
import {
  getCustomQuestions,
  createCustomQuestion,
  updateCustomQuestion,
  deleteCustomQuestion,
  getAssessmentAttachment,
  attachAssessment,
  detachAssessment,
} from "./custom-question.controller";
import { requireJobView } from "../../middlewares/job-access.middleware";
import { requireManager } from "../../middlewares/role.middleware";


const router:Router = Router({ mergeParams: true });


router.get("/", requireJobView(), getCustomQuestions);
router.post("/", requireManager, createCustomQuestion);
router.put("/:questionId", requireManager, updateCustomQuestion);
router.delete("/:questionId", requireManager, deleteCustomQuestion);


router.get("/assessment-attachment", requireJobView(), getAssessmentAttachment);
router.post("/assessment-attachment", requireManager, attachAssessment);
router.delete("/assessment-attachment/:stageId", requireManager, detachAssessment);

export default router;
