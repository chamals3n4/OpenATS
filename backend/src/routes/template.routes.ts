import { Router } from "express";
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  bulkDeleteTemplates,
  previewTemplate,
} from "../controllers/template.controller";

const router: Router = Router();

router.get("/", getAllTemplates);
router.post("/", createTemplate);
router.delete("/bulk", bulkDeleteTemplates);
router.get("/:id", getTemplateById);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);
router.post("/:id/preview", previewTemplate);

export default router;
