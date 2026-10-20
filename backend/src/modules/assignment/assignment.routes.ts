import { Router } from "express";
import {
  attachAssignment,
  createAssignment,
  detachAssignment,
  deleteAssignment,
  getAllAssignments,
  getJobAssignments,
  getAssignmentById,
  getCandidateAssignments,
  sendAssignment,
  updateAssignment,
} from "./assignment.controller";
import { requireManager } from "../../middlewares/role.middleware";
import { requireJobView } from "../../middlewares/job-access.middleware";

// What the hiring team does with assignments. The page a candidate uses, by link, is in
// routes/public.routes.ts.
const router: Router = Router();

router.get("/", getAllAssignments);
router.post("/", requireManager, createAssignment);
router.post("/send", requireManager, sendAssignment);
// Assignments a job sends by itself when candidates reach a stage
router.get("/job/:jobId", requireJobView("jobId"), getJobAssignments);
router.post("/job/:jobId", requireManager, attachAssignment);
router.delete("/job/:jobId/:attachmentId", requireManager, detachAssignment);
router.get("/candidate/:candidateId", getCandidateAssignments);
router.get("/:id", getAssignmentById);
router.put("/:id", requireManager, updateAssignment);
router.delete("/:id", requireManager, deleteAssignment);

export default router;
