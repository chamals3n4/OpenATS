import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  deactivateUser,
} from "./user.controller";
import { requireAdmin, requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.get("/", requireManager, getAllUsers);
router.get("/me", getCurrentUser);
router.get("/:id", requireManager, getUserById);
router.put("/:id", requireAdmin, updateUser);
router.delete("/:id", requireAdmin, deactivateUser);

export default router;
