import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { offers } from "../db/schema";
import { offerService, sendOfferResponseNotification } from "../services/offer.service";
import { isPastOfferResponseDeadline } from "../utils/offer-expiry";
import logger from "../utils/logger";

const VALID_ACTIONS = ["accept", "decline"] as const;
type RespondAction = (typeof VALID_ACTIONS)[number];

export type OfferRespondResult =
  | { outcome: "accepted" }
  | { outcome: "declined" }
  | { outcome: "already_responded"; previousStatus: string }
  | { outcome: "expired"; expiryDate: string }
  | { outcome: "invalid_link" }
  | { outcome: "error" };

// GET /public/offers/respond?token=xxx&action=accept|decline
// No auth — the token is what proves identity here.
// The Next.js confirmation page calls this server-side and renders the result.
export async function respondToOffer(req: Request, res: Response) {
  const token = req.query.token as string | undefined;
  const action = req.query.action as string | undefined;

  if (!token || !action || !VALID_ACTIONS.includes(action as RespondAction)) {
    return res.status(400).json({ outcome: "invalid_link" } satisfies OfferRespondResult);
  }

  try {
    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.responseToken, token));

    if (!offer) {
      return res.status(404).json({ outcome: "invalid_link" } satisfies OfferRespondResult);
    }

    // already responded — surface the current status so the page can say something useful
    if (offer.status !== "sent" && offer.status !== "pending") {
      return res.status(409).json({
        outcome: "already_responded",
        previousStatus: offer.status,
      } satisfies OfferRespondResult);
    }

    if (isPastOfferResponseDeadline(offer.expiryDate)) {
      return res.status(410).json({
        outcome: "expired",
        expiryDate: offer.expiryDate as string,
      } satisfies OfferRespondResult);
    }

    const newStatus = action === "accept" ? "accepted" : "declined";

    const updated = await offerService.updateStatus(offer.id, newStatus);
    if (!updated) {
      return res.status(500).json({ outcome: "error" } satisfies OfferRespondResult);
    }

    // notify hiring manager in the background, don't hold up the response
    void sendOfferResponseNotification(updated, newStatus);

    return res.status(200).json({ outcome: newStatus } satisfies OfferRespondResult);
  } catch (err) {
    logger.error("[offer-respond] unexpected error", err);
    return res.status(500).json({ outcome: "error" } satisfies OfferRespondResult);
  }
}
