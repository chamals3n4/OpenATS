import type { NextFunction, Request, Response } from "express";
import {
  isOriginAllowed,
  normalizeOrigin as norm,
  pageSettingsService,
} from "../modules/settings/page-settings.service";

const FORWARDED = "x-openats-browser-origin";

function getOrigin(req: Request): string | null {
  const forwarded = req.headers[FORWARDED];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return norm(forwarded);
  }
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.trim()) return norm(origin);
  const ref = req.headers.referer;
  if (typeof ref === "string" && ref.trim()) {
    try {
      return norm(new URL(ref).origin);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Stops other websites' pages from using the public API when a list of allowed origins is set.
 * It is not access control: the Origin header is sent by browsers, and a request made without a
 * browser (curl, a script) has no Origin and passes. Nothing behind this check may be private.
 */
export async function checkOrigins(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const allowed = await pageSettingsService.getAllowedOrigins();
    if (allowed.length === 0) {
      next();
      return;
    }

    const o = getOrigin(req);
    if (!o) {
      next();
      return;
    }

    if (!isOriginAllowed(o, allowed)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
