import { Router } from "express";
import multer from "multer";
import { uploadFile } from "./upload.controller";
import { expensiveLimiter } from "../../middlewares/rate-limit.middleware";

const router: Router = Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10mb limit
  }
});

// Each upload costs an R2 write, so these get the tighter budget.
router.post("/resume", expensiveLimiter, upload.single("file"), uploadFile);

router.post("/logo", expensiveLimiter, upload.single("file"), uploadFile);

export default router;
