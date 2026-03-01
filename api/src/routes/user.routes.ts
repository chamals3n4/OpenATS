import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
} from "../controllers/user.controller";

const router:Router = Router();

// GET  /api/users       → list all active users
// GET  /api/users/:id   → get user by ID
// PUT  /api/users/:id   → update name, role, avatar
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);

export default router;
