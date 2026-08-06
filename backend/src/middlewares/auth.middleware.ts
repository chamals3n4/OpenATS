import { Request, Response, NextFunction } from "express";
import { errors as joseErrors } from "jose";
import { AuthError, verifyAccessToken } from "../shared/auth/verify-token";
import logger from "../utils/logger";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  try {
    req.user = await verifyAccessToken(authHeader.slice(7));
    next();
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      logger.warn(`[authMiddleware] ${err.status}: ${err.message}`);
      res.status(err.status).json({ error: err.message });
      return;
    }

    if (err instanceof joseErrors.JOSEError) {
      logger.warn(
        `[authMiddleware] token rejected (${err.code}): ${err.message}`,
      );
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    logger.error("[authMiddleware] unexpected error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
};
