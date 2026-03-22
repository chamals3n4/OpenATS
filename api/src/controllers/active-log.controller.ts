import { Request, Response } from "express";
import { z } from "zod";
import { activeLogService } from "../services/active-log.service";

const listQuerySchema = z.object({
  search: z.string().optional(),
  level: z.enum(["all", "info", "warn", "error", "success"]).optional(),
  service: z.string().optional(),
  statusGroup: z.enum(["all", "2xx", "4xx", "5xx"]).optional(),
  windowSize: z.enum(["15m", "1h", "6h", "24h"]).optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createBodySchema = z.object({
  level: z.enum(["info", "warn", "error", "success"]),
  service: z.string().min(1),
  action: z.string().min(1),
  endpoint: z.string().min(1),
  actor: z.string().min(1),
  statusCode: z.number().int(),
  latencyMs: z.number().int().nonnegative(),
  requestId: z.string().min(1),
  ip: z.string().min(1),
  device: z.string().min(1),
  meta: z.unknown().optional(),
});

const exportQuerySchema = listQuerySchema.extend({
  format: z.enum(["csv", "json"]).default("csv"),
});

export const listActiveLogs = async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = await activeLogService.list(parsed.data);
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active logs" });
  }
};

export const getActiveLogById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid log ID" });
      return;
    }

    const data = await activeLogService.getById(id);
    if (!data) {
      res.status(404).json({ error: "Log not found" });
      return;
    }

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active log" });
  }
};

export const createActiveLog = async (req: Request, res: Response) => {
  try {
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = await activeLogService.create(parsed.data);
    res.status(201).json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to create active log" });
  }
};

export const exportActiveLogs = async (req: Request, res: Response) => {
  try {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { format, ...filters } = parsed.data;
    const data = await activeLogService.export(filters, format);
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to export active logs" });
  }
};
