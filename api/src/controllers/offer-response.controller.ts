import { Request, Response } from "express";
import { z } from "zod";
import { offerResponseService } from "../services/offer-response.service";
import logger from "../utils/logger";

const offerDecisionSchema = z.object({
  decision: z.enum(["accepted", "declined"]),
  responderName: z.string().trim().max(255).optional(),
  message: z.string().trim().max(2000).optional(),
});

export const getOfferForCandidate = async (req: Request, res: Response) => {
  try {
    const token = (req.params.token ?? "").toString();
    const offer = await offerResponseService.getByToken(token);
    if (!offer) {
      res.status(404).json({ error: "Offer response not found or invalid token" });
      return;
    }

    if (offer.expiresAt < new Date() && offer.status === "pending") {
      res.status(410).json({ error: "Offer response link has expired" });
      return;
    }

    res.status(200).json({ data: offer });
  } catch (error) {
    logger.error(
      `Failed to fetch candidate offer for token=${req.params.token}: ${(error as Error).message}`,
    );
    res.status(500).json({ error: "Failed to fetch offer response" });
  }
};

export const respondToOffer = async (req: Request, res: Response) => {
  try {
    const intentHeader = (req.headers["x-offer-response-intent"] ?? "")
      .toString()
      .trim();
    if (intentHeader !== "candidate-submit-v1") {
      res.status(400).json({
        error: "Invalid offer response request",
      });
      return;
    }

    const token = (req.params.token ?? "").toString();
    const parsed = offerDecisionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    if (
      parsed.data.decision === "accepted" &&
      (!parsed.data.responderName || parsed.data.responderName.trim().length < 2)
    ) {
      res.status(400).json({
        error: "Please provide your name to accept the offer",
      });
      return;
    }

    const updated = await offerResponseService.respondToOffer(token, parsed.data);
    res.status(200).json({ data: updated });
  } catch (error) {
    const message = (error as Error).message || "Failed to submit offer response";
    if (
      message.includes("invalid") ||
      message.includes("expired") ||
      message.includes("already responded")
    ) {
      res.status(400).json({ error: message });
      return;
    }
    logger.error(
      `Failed to respond to offer token=${req.params.token}: ${(error as Error).message}`,
    );
    res.status(500).json({ error: "Failed to submit offer response" });
  }
};
