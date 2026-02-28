import { Router } from "express";
import {
  getAllOffersByJob,
  getOfferById,
  createOffer,
  updateOffer,
  updateOfferStatus,
  deleteOffer,
} from "../controllers/offer.controller";

const router: Router = Router();

// GET  /api/offers/job/:jobId → list all offers for a specific job
router.get("/job/:jobId", getAllOffersByJob);

// GET  /api/offers/:id       → get offer details
router.get("/:id", getOfferById);

// POST /api/offers           → create a new offer (draft)
router.post("/", createOffer);

// PUT  /api/offers/:id       → update offer details (salary, template, etc.)
router.put("/:id", updateOffer);

// PATCH /api/offers/:id/status → transition offer status (e.g., to 'sent')
router.patch("/:id/status", updateOfferStatus);

// DELETE /api/offers/:id     → remove an offer
router.delete("/:id", deleteOffer);

export default router;
