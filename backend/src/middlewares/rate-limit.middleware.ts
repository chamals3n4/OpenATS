import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

// Rate limiting for the authenticated API. `/public/*` has its own limiters.

const WINDOW_MS = 15 * 60 * 1000;

// Keyed by user, not IP, so an office behind one NAT does not share a budget.
function userKey(req: Request): string {
  if (req.user?.id) return `user_${req.user.id}`;
  return ipKeyGenerator(req.ip ?? "unknown");
}

const shared = {
  windowMs: WINDOW_MS,
  standardHeaders: true as const,
  legacyHeaders: false as const,
  keyGenerator: userKey,
};

// Generous: the dashboard refetches on every socket event.
export const apiLimiter = rateLimit({
  ...shared,
  limit: Number(process.env.RATE_LIMIT_API ?? 1000),
  message: { error: "Too many requests. Please slow down and try again." },
});

// For requests that cost storage or an external provider call.
export const expensiveLimiter = rateLimit({
  ...shared,
  limit: Number(process.env.RATE_LIMIT_EXPENSIVE ?? 60),
  message: {
    error: "Too many requests for this operation. Please try again later.",
  },
});
