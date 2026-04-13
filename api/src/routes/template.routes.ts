import { Router } from "express";
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  sendCandidateEmail,
} from "../controllers/template.controller";

const router: Router = Router();

router.get("/", getAllTemplates);
router.post("/", createTemplate);
router.post("/send-email", sendCandidateEmail);
router.get("/:id", getTemplateById);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);
router.post("/:id/preview", previewTemplate);

export default router;
