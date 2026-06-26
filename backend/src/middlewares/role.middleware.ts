import type { Request, Response, NextFunction } from "express";

export function requireManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.user.role !== "super_admin" && req.user.role !== "hiring_manager") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
