import { Request, Response } from "express";
import { z } from "zod";
import { offerService } from "../services/offer.service";
import logger from "../utils/logger";

/** ISO 4217; empty string → null. Undefined = omit field (partial update). */
const currencyField = z.preprocess((v) => {
  if (v === undefined) return undefined;
  if (v === "" || v === null) return null;
  return v;
}, z.union([z.string().length(3, "Currency must be a 3-letter ISO code (e.g. USD)"), z.null()]).optional());

const templateIdField = z.preprocess((v) => {
  if (v === undefined) return undefined;
  if (v === "" || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}, z.union([z.number().int().positive(), z.null()]).optional());

const salaryField = z.preprocess((v) => {
  if (v === undefined) return undefined;
  if (v === "" || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}, z.union([z.number().positive("Salary must be greater than zero"), z.null()]).optional());

const createOfferSchema = z.object({
  candidateId: z.number().int().positive(),
  jobId: z.number().int().positive(),
  templateId: templateIdField,
  salary: salaryField,
  currency: currencyField,
  payFrequency: z.enum(["hourly", "daily", "weekly", "monthly", "yearly"]).optional().nullable(),
  startDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  benefitsText: z.string().max(20000).optional().nullable(),
});

const updateOfferSchema = z.object({
  templateId: templateIdField,
  status: z.enum(["draft", "sent", "pending", "accepted", "declined", "withdrawn"]).optional(),
  salary: salaryField,
  currency: currencyField,
  payFrequency: z.enum(["hourly", "daily", "weekly", "monthly", "yearly"]).optional().nullable(),
  startDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  benefitsText: z.string().max(20000).optional().nullable(),
  renderedHtml: z.string().optional().nullable(),
});

const statusUpdateSchema = z.object({
  status: z.enum(["draft", "sent", "pending", "accepted", "declined", "withdrawn"]),
});

export const getAllOffers = async (req: Request, res: Response) => {
  try {
    const result = await offerService.getAllDetails();
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch all offers: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch all offers" });
  }
};

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
    logger.error(`Failed to fetch offers for job id=${req.params.jobId}: ${(error as any)?.message}`);
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
    logger.error(`Failed to fetch offer id=${req.params.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch offer" });
  }
};

export const createOffer = async (req: Request, res: Response) => {
  try {
    const parsed = createOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      logger.warn(
        `Offer creation validation failed - user ${req.user?.id}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
      );
      res.status(400).json({
        error: first?.message ?? "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await offerService.create({
      ...parsed.data,
      createdBy: req.user.id,
    });
    logger.info(
      `Offer created: id=${result.id}, candidateId=${parsed.data.candidateId}, jobId=${parsed.data.jobId}, createdBy=${req.user.id}`,
    );
    res.status(201).json({ data: result });
  } catch (error: any) {
    logger.error(`Failed to create offer - user ${req.user?.id}: ${error?.message}`);
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
      const first = parsed.error.issues[0];
      res.status(400).json({
        error: first?.message ?? "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await offerService.update(id, parsed.data);
    if (!result) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    logger.info(`Offer updated: id=${id} by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to update offer id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`,
    );
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

    logger.info(
      `Offer status updated: id=${id}, newStatus="${parsed.data.status}" by user ${req.user?.id}`,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to update offer status id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`,
    );
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

    logger.warn(`Offer deletion requested: id=${id} by user ${req.user?.id}`);
    const result = await offerService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    logger.info(`Offer deleted: id=${id} by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to delete offer id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`,
    );
    res.status(500).json({ error: "Failed to delete offer" });
  }
};
