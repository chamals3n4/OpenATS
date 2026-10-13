import { Router } from "express";
import {
  acceptOffer,
  bulkDeleteOffers,
  createOffer,
  declineOffer,
  deleteOffer,
  getAllOffers,
  getAllOffersByJob,
  getOfferById,
  markCandidateHired,
  sendOffer,
  updateOffer,
} from "./offer.controller";

import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

// Offers hold salaries, and accepting or declining one here is a manager recording the candidate's
// answer. None of it is for interviewers, so the whole router is managers only. (The candidate
// answers their own offer through /public/offers/:token.)
router.use(requireManager);

router.get("/", getAllOffers);
router.delete("/bulk", bulkDeleteOffers);
router.get("/job/:jobId", getAllOffersByJob);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.patch("/:id", updateOffer);
router.delete("/:id", deleteOffer);
router.post("/:id/send", sendOffer);
router.post("/:id/accept", acceptOffer);
router.post("/:id/decline", declineOffer);
router.post("/:id/mark-hired", markCandidateHired);

export default router;
