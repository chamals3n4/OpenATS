import { Router } from "express";
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
} from "../controllers/template.controller";

const router: Router = Router();

// GET    /api/templates            → list all (supports ?type=offer filter)
// POST   /api/templates            → create a template
// GET    /api/templates/:id        → get by ID
// PUT    /api/templates/:id        → update
// DELETE /api/templates/:id        → delete
// POST   /api/templates/:id/preview → preview with context
router.get("/", getAllTemplates);
router.post("/", createTemplate);
router.get("/:id", getTemplateById);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);
router.post("/:id/preview", previewTemplate);

export default router;
