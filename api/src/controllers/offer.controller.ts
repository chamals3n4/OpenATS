import { Request, Response } from "express";
import { z } from "zod";
import { offerService } from "../services/offer.service";

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const createOfferSchema = z.object({
  candidateId: z.number().int().positive(),
  jobId: z.number().int().positive(),
  templateId: z.number().int().positive().optional().nullable(),
  salary: z.number().positive().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  payFrequency: z.enum(["hourly", "daily", "weekly", "monthly", "yearly"]).optional().nullable(),
  startDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  // TODO: remove default when auth is ready
  createdBy: z.number().int().positive().default(1),
});

const updateOfferSchema = z.object({
  templateId: z.number().int().positive().optional().nullable(),
  status: z.enum(["draft", "sent", "pending", "accepted", "declined", "withdrawn"]).optional(),
  salary: z.number().positive().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  payFrequency: z.enum(["hourly", "daily", "weekly", "monthly", "yearly"]).optional().nullable(),
  startDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  renderedHtml: z.string().optional().nullable(),
});

const statusUpdateSchema = z.object({
  status: z.enum(["draft", "sent", "pending", "accepted", "declined", "withdrawn"]),
});

// ── Offer Controllers ─────────────────────────────────────────────────────────

export const getAllOffersByJob = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const result = await offerService.getAllByJob(jobId);
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch offers" });
  }
};

export const getOfferById = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const result = await offerService.getById(id);
    if (!result) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch offer" });
  }
};

export const createOffer = async (req: Request, res: Response) => {
  try {
    const parsed = createOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await offerService.create(parsed.data);
    res.status(201).json({ data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to create offer" });
  }
};

export const updateOffer = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const parsed = updateOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await offerService.update(id, parsed.data);
    if (!result) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to update offer" });
  }
};

export const updateOfferStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const parsed = statusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await offerService.updateStatus(id, parsed.data.status);
    if (!result) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to update offer status" });
  }
};

export const deleteOffer = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const result = await offerService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete offer" });
  }
};
