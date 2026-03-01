import { Router } from "express";
import companyRoutes from "./company.routes";
import jobRoutes from "./job.routes";
import userRoutes from "./user.routes";
import templateRoutes from "./template.routes";
import assessmentRoutes from "./assessment.routes";
import candidateRoutes from "./candidate.routes";
import assessmentExecutionRoutes from "./assessment-execution.routes";
import offerRoutes from "./offer.routes";
import uploadRoutes from "./upload.routes";
import chatRoutes from "./chat.routes";

const router: Router = Router();

router.use("/company", companyRoutes);
router.use("/jobs", jobRoutes);
router.use("/users", userRoutes);
router.use("/templates", templateRoutes);
router.use("/assessments", assessmentRoutes);
router.use("/candidates", candidateRoutes);
router.use("/assessment-execution", assessmentExecutionRoutes);
router.use("/offers", offerRoutes);
router.use("/upload", uploadRoutes);
router.use("/chat", chatRoutes);

export default router;
