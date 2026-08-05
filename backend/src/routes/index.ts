import { Router } from "express";
import companyRoutes from "../modules/company/company.routes";
import jobRoutes from "../modules/job/job.routes";
import userRoutes from "../modules/user/user.routes";
import templateRoutes from "../modules/template/template.routes";
import assessmentRoutes from "../modules/assessment/assessment.routes";
import candidateRoutes from "../modules/candidate/candidate.routes";
import assessmentExecutionRoutes from "../modules/assessment-execution/assessment-execution.routes";
import offerRoutes from "../modules/offer/offer.routes";
import uploadRoutes from "../modules/upload/upload.routes";
import chatRoutes from "../modules/chat/chat.routes";
import reportRoutes from "../modules/report/report.routes";
import settingsRoutes from "../modules/settings/settings.routes";
import interviewRoutes from "../modules/interview/interviews.routes";
import rejectionRoutes from "../modules/rejection/rejections.routes";
import integrationRoutes from "../modules/integrations/integrations.routes";

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
