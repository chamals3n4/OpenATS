import { Router } from "express";
import multer from "multer";
import { uploadLogo } from "./upload.controller";
import { expensiveLimiter } from "../../middlewares/rate-limit.middleware";

const router: Router = Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10mb limit
  }
});

// Each upload costs an R2 write, so this gets the tighter budget. A CV is not uploaded here: it
// arrives with the candidate (PATCH /candidates/:id) or from the careers page (/public/upload/resume).
router.post("/logo", expensiveLimiter, upload.single("file"), uploadLogo);

export default router;
