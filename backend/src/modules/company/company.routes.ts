import { Router } from "express";
import {
  getCompany,
  upsertCompany,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "./company.controller";

import { requireAdmin } from "../../middlewares/role.middleware";

const router: Router = Router();

router.get("/", getCompany);
router.put("/", requireAdmin, upsertCompany);

router.get("/departments", getDepartments);
router.post("/departments", requireAdmin, createDepartment);
router.put("/departments/:id", requireAdmin, updateDepartment);
router.delete("/departments/:id", requireAdmin, deleteDepartment);

export default router;
