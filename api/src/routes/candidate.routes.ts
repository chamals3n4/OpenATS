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
import {
  requireAnyRole,
  requireJobReadAccess,
} from "../middlewares/rbac.middleware";

const router: Router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/jobs/:jobId/apply", applyForJob);

router.get("/", requireAnyRole("super_admin", "hiring_manager"), getCandidates);
router.get("/jobs/:jobId", requireJobReadAccess("jobId"), getCandidates);
router.get("/:id", requireAnyRole("super_admin", "hiring_manager"), getCandidateById);
router.patch(
  "/:id",
  requireAnyRole("super_admin", "hiring_manager"),
  upload.single("resume"),
  updateCandidateBasicDetails,
);
router.put(
  "/:id/stage",
  requireAnyRole("super_admin", "hiring_manager"),
  moveCandidateStage,
);
router.delete(
  "/:id",
  requireAnyRole("super_admin", "hiring_manager"),
  deleteCandidate,
);

export default router;
