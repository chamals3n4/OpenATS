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

const router: Router = Router();

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
