import { Router } from "express";
import { z } from "zod";
import { notificationService } from "../../shared/services/notification.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

const router: Router = Router();

// The signed-in user's own notifications, newest first, with how many are unread.
router.get("/", async (req, res) => {
  try {
    res.status(200).json(await notificationService.list(req.user));
  } catch (error) {
    logger.error(`Failed to list notifications for user ${req.user.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

const readSchema = z.object({
  /** Leave out to mark every notification read. */
  ids: z.array(z.number().int().positive()).max(200).optional(),
});

router.post("/read", async (req, res) => {
  try {
    const parsed = readSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      return;
    }
    await notificationService.markRead(req.user.id, parsed.data.ids);
    res.status(200).json({ data: { ok: true } });
  } catch (error) {
    logger.error(`Failed to mark notifications read for user ${req.user.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

export default router;
