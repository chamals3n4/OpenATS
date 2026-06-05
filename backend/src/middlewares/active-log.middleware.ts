import { NextFunction, Request, Response } from "express";
import { activeLogService } from "../services/active-log.service";

export const activeLogMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    void activeLogService.captureFromRequest(req, res, startedAt);
  });

  next();
};
