import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import logger from "../utils/logger";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    logger.warn(`[Error] ${req.method} ${req.path}: validation failed`);
    res.status(400).json({
      error: "Invalid request",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  logger.error(
    `[Error] ${req.method} ${req.path}: ${err.stack ?? err.message}`,
  );
  res.status(500).json({ error: "Internal server error" });
};
