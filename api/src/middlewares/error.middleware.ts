import { Request, Response, NextFunction } from "express";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  res.status(500).json({ error: "Internal server error" });
};
