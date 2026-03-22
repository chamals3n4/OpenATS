import { Request, Response } from "express";
import { z } from "zod";
import { reportService } from "../services/report.service";

const periodSchema = z.enum(["7d", "30d", "90d"]).default("7d");
const formatSchema = z.enum(["csv", "json"]).default("csv");

const reportQuerySchema = z.object({
  period: periodSchema.optional(),
  departmentId: z.coerce.number().int().positive().optional(),
});

const exportQuerySchema = z.object({
  period: periodSchema.optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  format: formatSchema.optional(),
});

export const getReportsAnalytics = async (req: Request, res: Response) => {
  try {
    const parsed = reportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const period = parsed.data.period ?? "7d";
    const departmentId = parsed.data.departmentId;

    const result = await reportService.getAnalytics(period, departmentId);
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics report" });
  }
};

export const exportReportsAnalytics = async (req: Request, res: Response) => {
  try {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const period = parsed.data.period ?? "7d";
    const format = parsed.data.format ?? "csv";
    const departmentId = parsed.data.departmentId;

    const result = await reportService.exportAnalytics(
      period,
      format,
      departmentId,
    );

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to export analytics report" });
  }
};
