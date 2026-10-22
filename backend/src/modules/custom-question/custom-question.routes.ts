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
router.post("/", requireManager, requireJobView(), createCustomQuestion);
router.put("/:questionId", requireManager, requireJobView(), updateCustomQuestion);
router.delete("/:questionId", requireManager, requireJobView(), deleteCustomQuestion);


router.get("/assessment-attachment", requireJobView(), getAssessmentAttachment);
router.post("/assessment-attachment", requireManager, requireJobView(), attachAssessment);
router.delete("/assessment-attachment/:stageId", requireManager, requireJobView(), detachAssessment);

export default router;
