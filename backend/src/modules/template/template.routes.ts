import { Router } from "express";
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  bulkDeleteTemplates,
  previewTemplate,
  listSystemEmails,
  saveSystemEmail,
  resetSystemEmail,
} from "./template.controller";

import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.get("/", getAllTemplates);
router.post("/", requireManager, createTemplate);
router.delete("/bulk", requireManager, bulkDeleteTemplates);
// Before "/:id", which would otherwise read "system" as an id.
router.get("/system", listSystemEmails);
router.put("/system/:purpose", requireManager, saveSystemEmail);
router.delete("/system/:purpose", requireManager, resetSystemEmail);
router.get("/:id", getTemplateById);
router.put("/:id", requireManager, updateTemplate);
router.delete("/:id", requireManager, deleteTemplate);
router.post("/:id/preview", previewTemplate);

export default router;
