import { Router } from "express";
import multer from "multer";
import {
  applyForJob,
  getCandidates,
  getCandidateById,
  moveCandidateStage,
  deleteCandidate,
  updateCandidateBasicDetails,
} from "../controllers/candidate.controller";

const router: Router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/jobs/:jobId/apply", applyForJob);

router.get("/", getCandidates);
router.get("/jobs/:jobId", getCandidates);
router.get("/:id", getCandidateById);
router.patch("/:id", upload.single("resume"), updateCandidateBasicDetails);
router.put("/:id/stage", moveCandidateStage);
router.delete("/:id", deleteCandidate);

export default router;
