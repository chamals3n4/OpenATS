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
import { requireJobView, requireOfferView } from "../../middlewares/job-access.middleware";

const router: Router = Router();

// Offers hold salaries, and accepting or declining one here is a manager recording the candidate's
// answer. None of it is for interviewers, so the whole router is managers only. (The candidate
// answers their own offer through /public/offers/:token.)
// A manager also works only on the offers of jobs whose hiring team they are on.
router.use(requireManager);

router.get("/", getAllOffers);
router.delete("/bulk", bulkDeleteOffers);
router.get("/job/:jobId", requireJobView(), getAllOffersByJob);
router.get("/:id", requireOfferView(), getOfferById);
router.post("/", createOffer);
router.patch("/:id", requireOfferView(), updateOffer);
router.delete("/:id", requireOfferView(), deleteOffer);
router.post("/:id/send", requireOfferView(), sendOffer);
router.post("/:id/accept", requireOfferView(), acceptOffer);
router.post("/:id/decline", requireOfferView(), declineOffer);
router.post("/:id/mark-hired", requireOfferView(), markCandidateHired);

export default router;
