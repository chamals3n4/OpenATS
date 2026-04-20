import http from "http";
import app from "./app";
import { offerService } from "./services/offer.service";
import { socketService } from "./services/socket.service";
import logger from "./utils/logger";

const PORT = process.env.PORT || 8080;

/** How often to scan for offers past `expiry_date` and auto-withdraw (default 1h, min 1m). */
const parsedSweep = Number(process.env.OFFER_EXPIRY_SWEEP_INTERVAL_MS);
const OFFER_EXPIRY_SWEEP_MS = Math.max(
  60_000,
  Number.isFinite(parsedSweep) && parsedSweep > 0
    ? parsedSweep
    : 60 * 60 * 1000,
);

const server = http.createServer(app);

socketService.initialize(server);

function scheduleOfferExpirySweep() {
  const run = async () => {
    try {
      const n = await offerService.withdrawExpiredOffers();
      if (n > 0) {
        logger.info(`[offers] auto-withdrew ${n} expired offer(s)`);
      }
    } catch (err) {
      logger.warn("[offers] expiry sweep failed", err);
    }
  };

  void run();
  return setInterval(run, OFFER_EXPIRY_SWEEP_MS);
}

server.listen(PORT, () => {
  logger.info(`OpenATS Backend running on port ${PORT}`);
  logger.info(`Socket.io initialized and listening on the same port.`);
  scheduleOfferExpirySweep();
});
