import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  createUser,
} from "../controllers/user.controller";

const router: Router = Router();

router.get("/", getAllUsers);
router.get("/me", getCurrentUser);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);

export default router;
