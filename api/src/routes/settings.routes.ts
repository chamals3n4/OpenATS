import { Router, type Request, type Response, type NextFunction } from "express";
import {
  getAllowedOrigins,
  putAllowedOrigins,
} from "../controllers/page-settings.controller";

const router: Router = Router();

function requireManager(req: Request, res: Response, next: NextFunction) {
  const role = req.user.role;
  if (role !== "super_admin" && role !== "hiring_manager") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

router.get("/allowed-origins", requireManager, getAllowedOrigins);
router.put("/allowed-origins", requireManager, putAllowedOrigins);

export default router;
