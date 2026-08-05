import { Router } from "express";
import {
  getCompany,
  upsertCompany,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "./company.controller";

import { requireAdmin, requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.get("/", getCompany);
router.put("/", requireAdmin, upsertCompany);

router.get("/departments", getDepartments);
router.post("/departments", requireManager, createDepartment);
router.put("/departments/:id", requireManager, updateDepartment);
router.delete("/departments/:id", requireManager, deleteDepartment);

export default router;
