import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error(`[Error] ${req.method} ${req.path}: ${err.message}`);
  res.status(500).json({ error: "Internal server error" });
};
