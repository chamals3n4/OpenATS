import { Router } from "express";
import multer from "multer";
import { uploadFile } from "../controllers/upload.controller";

const router: Router = Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10mb limit
  }
});

router.post("/resume", upload.single("file"), uploadFile);

router.post("/logo", upload.single("file"), uploadFile);

export default router;
