import { Request, Response } from "express";
import { z } from "zod";
import { templateService } from "../services/template.service";
import { templateEngineService } from "../services/template-engine.service";

// ── Zod Schemas ───────────────────────────────────────────────────────────────

// Each content block in the body
const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), content: z.string() }),
  z.object({ type: z.literal("text"), content: z.string() }),
  z.object({ type: z.literal("button"), label: z.string(), url: z.string() }),
  z.object({
    type: z.literal("image"),
    url: z.string(),
    alt: z.string().optional(),
  }),
  z.object({ type: z.literal("divider") }),
  z.object({ type: z.literal("spacer"), height: z.number() }),
]);

const templateTypeEnum = z.enum([
  "offer",
  "rejection",
  "assessment_invite",
  "general",
]);

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: templateTypeEnum,
  subject: z.string().min(1, "Subject is required").max(500),
  bodyJson: z.array(contentBlockSchema).default([]),
  // TODO: replace with req.user.id once auth is in place
  createdBy: z.number().int().positive().default(1),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: templateTypeEnum.optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyJson: z.array(contentBlockSchema).optional(),
});

// ── Controllers ───────────────────────────────────────────────────────────────

export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    // Optional ?type= query filter e.g. /api/templates?type=offer
    const { type } = req.query;

    const result = type
      ? await templateService.getByType(type as string)
      : await templateService.getAll();

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid template ID" });
      return;
    }

    const result = await templateService.getById(id);
    if (!result) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch template" });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await templateService.create(parsed.data);
    res.status(201).json({ data: result });
  } catch (error: any) {
    // FK violation — createdBy user doesn't exist
    if (error?.code === "23503") {
      res.status(400).json({ error: "User not found" });
      return;
    }
    res.status(500).json({ error: "Failed to create template" });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid template ID" });
      return;
    }

    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await templateService.update(id, parsed.data);
    if (!result) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to update template" });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid template ID" });
      return;
    }

    const result = await templateService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete template" });
  }
};

export const previewTemplate = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid template ID" });
      return;
    }

    const template = await templateService.getById(id);
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const context = req.body; // Context like candidate_name, etc.
    const result = templateEngineService.compileTemplate(
      template.subject,
      template.bodyJson,
      context
    );

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to preview template" });
  }
};
