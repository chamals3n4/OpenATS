import { Router } from "express";
import {
  getCompany,
  upsertCompany,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/company.controller";

const router: Router = Router();

router.get("/", getCompany);
router.put("/", upsertCompany);

router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

export default router;
