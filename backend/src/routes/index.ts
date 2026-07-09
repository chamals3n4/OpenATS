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
import reportRoutes from "./report.routes";
import settingsRoutes from "./settings.routes";
import interviewRoutes from "./interviews.routes";
import rejectionRoutes from "./rejections.routes";
import integrationRoutes from "./integrations.routes";

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
router.use("/reports", reportRoutes);
router.use("/settings", settingsRoutes);
router.use("/", interviewRoutes);
router.use("/", rejectionRoutes);
router.use("/integrations", integrationRoutes);

export default router;
