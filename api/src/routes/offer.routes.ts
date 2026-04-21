import { Router } from "express";
import {
  getAllOffers,
  getAllOffersByJob,
  getOfferById,
  createOffer,
  updateOffer,
  updateOfferStatus,
  deleteOffer,
  markOfferResponseManually,
} from "../controllers/offer.controller";

const router: Router = Router();

router.get("/", getAllOffers);
router.get("/job/:jobId", getAllOffersByJob);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.put("/:id", updateOffer);
router.patch("/:id/status", updateOfferStatus);
router.patch("/:id/manual-response", markOfferResponseManually);
router.delete("/:id", deleteOffer);

export default router;
