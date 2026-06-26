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
} from "../controllers/offer.controller";

import { requireManager } from "../middlewares/role.middleware";

const router: Router = Router();

router.get("/", getAllOffers);
router.delete("/bulk", requireManager, bulkDeleteOffers);
router.get("/job/:jobId", getAllOffersByJob);
router.get("/:id", getOfferById);
router.post("/", requireManager, createOffer);
router.patch("/:id", requireManager, updateOffer);
router.delete("/:id", requireManager, deleteOffer);
router.post("/:id/send", requireManager, sendOffer);
router.post("/:id/accept", acceptOffer);
router.post("/:id/decline", declineOffer);
router.post("/:id/mark-hired", requireManager, markCandidateHired);

export default router;
