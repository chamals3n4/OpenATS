import { Router } from "express";
import {
  acceptOffer,
  createOffer,
  declineOffer,
  getAllOffers,
  getAllOffersByJob,
  getOfferById,
  markCandidateHired,
  sendOffer,
  updateOffer,
} from "../controllers/offer.controller";

const router: Router = Router();

router.get("/", getAllOffers);
router.get("/job/:jobId", getAllOffersByJob);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.patch("/:id", updateOffer);
router.post("/:id/send", sendOffer);
router.post("/:id/accept", acceptOffer);
router.post("/:id/decline", declineOffer);
router.post("/:id/mark-hired", markCandidateHired);

export default router;
