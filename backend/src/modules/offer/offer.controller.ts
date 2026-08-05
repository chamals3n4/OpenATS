import { Request, Response } from "express";
import { z } from "zod";
import { offerService } from "./offer.service";
import { socketService } from "../../shared/services/socket.service";
import logger from "../../utils/logger";

const bulkDeleteOffersSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

const offerStatusSchema = z.enum([
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
]);

const offerInputSchema = z.object({
  candidateId: z.number().int().positive(),
  jobId: z.number().int().positive(),
  templateId: z.number().int().positive().optional().nullable(),
  salary: z.number().positive().optional().nullable(),
  currency: z.string().trim().length(3).optional().nullable(),
  employmentType: z
    .enum(["full_time", "part_time", "contract", "internship", "freelance"])
    .optional()
    .nullable(),
  startDate: z.string().date().optional().nullable(),
  reportingManager: z.string().trim().min(1).max(255).optional().nullable(),
  benefits: z.string().trim().min(1).max(4000).optional().nullable(),
  offerLetterHtml: z.string().optional().nullable(),
  status: offerStatusSchema.optional(),
});

const offerUpdateSchema = z.object({
  templateId: z.number().int().positive().optional().nullable(),
  salary: z.number().positive().optional().nullable(),
  currency: z.string().trim().length(3).optional().nullable(),
  employmentType: z
    .enum(["full_time", "part_time", "contract", "internship", "freelance"])
    .optional()
    .nullable(),
  startDate: z.string().date().optional().nullable(),
  reportingManager: z.string().trim().min(1).max(255).optional().nullable(),
  benefits: z.string().trim().min(1).max(4000).optional().nullable(),
  offerLetterHtml: z.string().optional().nullable(),
  status: offerStatusSchema.optional(),
});

function paramStr(value: string | string[] | undefined) {
  return (value ?? "").toString();
}

function parseId(value: string | string[] | undefined) {
  const parsed = parseInt(paramStr(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export const getAllOffers = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, status, jobId } = req.query;

    if (page !== undefined) {
      const result = await offerService.getPaginated({
        page: parseInt(page as string) || 1,
        limit: parseInt((limit as string) ?? "15") || 15,
        search: (search as string) || undefined,
        status: (status as string) || undefined,
        jobId: jobId ? parseInt(jobId as string) : undefined,
      });
      res.status(200).json({
        data: result.rows,
        pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
      });
      return;
    }

    const result = await offerService.getAllDetails();
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch all offers: ${(error as Error)?.message}`);
    res.status(500).json({ error: "Failed to fetch all offers" });
  }
};

export const deleteOffer = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }
    logger.warn(`Offer deletion requested: id=${id} by user ${req.user?.id}`);
    const deleted = await offerService.deleteById(id);
    if (!deleted) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }
    socketService.notifyOfferChanged({
      offerId: deleted.id,
      candidateId: deleted.candidateId,
      jobId: deleted.jobId,
    });
    res.status(200).json({ data: deleted });
  } catch (error) {
    logger.error(`Failed to delete offer ${req.params.id}: ${(error as Error)?.message}`);
    res.status(500).json({ error: "Failed to delete offer" });
  }
};

export const bulkDeleteOffers = async (req: Request, res: Response) => {
  try {
    const parsed = bulkDeleteOffersSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      return;
    }
    logger.warn(`Bulk offer deletion requested: ids=${parsed.data.ids.join(",")} by user ${req.user?.id}`);
    const deleted = await offerService.deleteMany(parsed.data.ids);
    for (const offer of deleted) {
      socketService.notifyOfferChanged({
        offerId: offer.id,
        candidateId: offer.candidateId,
        jobId: offer.jobId,
      });
    }
    res.status(200).json({ data: deleted, count: deleted.length });
  } catch (error) {
    logger.error(`Failed to bulk delete offers - user ${req.user?.id}: ${(error as Error)?.message}`);
    res.status(500).json({ error: "Failed to delete offers" });
  }
};

export const getAllOffersByJob = async (req: Request, res: Response) => {
  try {
    const jobId = parseId(req.params.jobId);
    if (!jobId) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const result = await offerService.getAllByJob(jobId);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to fetch offers for job ${req.params.jobId}: ${(error as Error)?.message}`,
    );
    res.status(500).json({ error: "Failed to fetch offers" });
  }
};

export const getOfferById = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
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
    logger.error(`Failed to fetch offer ${req.params.id}: ${(error as Error)?.message}`);
    res.status(500).json({ error: "Failed to fetch offer" });
  }
};

export const createOffer = async (req: Request, res: Response) => {
  try {
    const parsed = offerInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const created = await offerService.create({
      ...parsed.data,
      createdBy: req.user.id,
    });

    socketService.notifyOfferChanged({
      offerId: created.id,
      candidateId: created.candidateId,
      jobId: created.jobId,
    });

    res.status(201).json({ data: created });
  } catch (error) {
    logger.error(`Failed to create offer: ${(error as Error)?.message}`);
    res.status(400).json({ error: (error as Error).message || "Failed to create offer" });
  }
};

export const updateOffer = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const parsed = offerUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const updated = await offerService.update(id, parsed.data, req.user.id);
    if (!updated) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    socketService.notifyOfferChanged({
      offerId: updated.id,
      candidateId: updated.candidateId,
      jobId: updated.jobId,
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    logger.error(`Failed to update offer ${req.params.id}: ${(error as Error)?.message}`);
    res.status(400).json({ error: (error as Error).message || "Failed to update offer" });
  }
};

export const sendOffer = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const sent = await offerService.send(id, req.user.id);
    if (!sent) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    socketService.notifyOfferChanged({
      offerId: sent.id,
      candidateId: sent.candidateId,
      jobId: sent.jobId,
    });

    res.status(200).json({ data: sent });
  } catch (error) {
    logger.error(`Failed to send offer ${req.params.id}: ${(error as Error)?.message}`);
    res.status(400).json({ error: (error as Error).message || "Failed to send offer" });
  }
};

export const acceptOffer = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const accepted = await offerService.acceptById(id, req.user.id);
    if (!accepted) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    socketService.notifyOfferChanged({
      offerId: accepted.id,
      candidateId: accepted.candidateId,
      jobId: accepted.jobId,
    });

    res.status(200).json({ data: accepted });
  } catch (error) {
    logger.error(`Failed to accept offer ${req.params.id}: ${(error as Error)?.message}`);
    res.status(400).json({ error: (error as Error).message || "Failed to accept offer" });
  }
};

export const declineOffer = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const declined = await offerService.declineById(id, req.user.id);
    if (!declined) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    socketService.notifyOfferChanged({
      offerId: declined.id,
      candidateId: declined.candidateId,
      jobId: declined.jobId,
    });

    res.status(200).json({ data: declined });
  } catch (error) {
    logger.error(`Failed to decline offer ${req.params.id}: ${(error as Error)?.message}`);
    res.status(400).json({ error: (error as Error).message || "Failed to decline offer" });
  }
};

export const markCandidateHired = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid offer ID" });
      return;
    }

    const result = await offerService.markAsHired(id, req.user.id);
    if (!result) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    socketService.notifyOfferChanged({
      offerId: id,
      candidateId: result.candidate.id,
      jobId: result.candidate.jobId,
    });
    socketService.notifyStageChanged({
      candidateId: result.candidate.id,
      jobId: result.candidate.jobId,
      stageId: result.hiredStage.id,
    });

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to mark offer ${req.params.id} as hired: ${(error as Error)?.message}`);
    res.status(400).json({ error: (error as Error).message || "Failed to mark as hired" });
  }
};

export const getPublicOfferByToken = async (req: Request, res: Response) => {
  try {
    const token = paramStr(req.params.token).trim();
    if (!token) {
      res.status(400).json({ error: "Invalid token" });
      return;
    }

    const result = await offerService.getPublicByToken(token);
    if (!result) {
      res.status(404).json({ error: "Offer link is invalid" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to get public offer by token: ${(error as Error)?.message}`);
    res.status(500).json({ error: "Failed to fetch offer" });
  }
};

export const acceptPublicOffer = async (req: Request, res: Response) => {
  try {
    const token = paramStr(req.params.token).trim();
    if (!token) {
      res.status(400).json({ error: "Invalid token" });
      return;
    }

    const result = await offerService.acceptByToken(token);
    if (!result) {
      res.status(404).json({ error: "Offer link is invalid" });
      return;
    }

    socketService.notifyOfferChanged({
      offerId: result.id,
      candidateId: result.candidateId,
      jobId: result.jobId,
    });

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to accept public offer: ${(error as Error)?.message}`);
    res.status(400).json({ error: (error as Error).message || "Failed to accept offer" });
  }
};

export const declinePublicOffer = async (req: Request, res: Response) => {
  try {
    const token = paramStr(req.params.token).trim();
    if (!token) {
      res.status(400).json({ error: "Invalid token" });
      return;
    }

    const result = await offerService.declineByToken(token);
    if (!result) {
      res.status(404).json({ error: "Offer link is invalid" });
      return;
    }

    socketService.notifyOfferChanged({
      offerId: result.id,
      candidateId: result.candidateId,
      jobId: result.jobId,
    });

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to decline public offer: ${(error as Error)?.message}`);
    res.status(400).json({ error: (error as Error).message || "Failed to decline offer" });
  }
};
