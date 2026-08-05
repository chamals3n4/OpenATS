import { Request, Response } from "express";
import { z } from "zod";
import { templateService } from "./template.service";
import { templateEngineService } from "./template-engine.service";
import logger from "../../utils/logger";

const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), content: z.string() }),
  z.object({ type: z.literal("text"), content: z.string() }),
  z.object({ type: z.literal("button"), content: z.string() }),
  z.object({
    type: z.literal("image"),
    url: z.string(),
    alt: z.string().optional(),
  }),
  z.object({ type: z.literal("divider") }),
  z.object({ type: z.literal("spacer"), height: z.number() }),
]);

const templateTypeEnum = z.enum(["email", "event"]);

const bodyJsonSchema = z.union([z.string(), z.array(contentBlockSchema)]);

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: templateTypeEnum,
  subject: z.string().min(1, "Subject is required").max(500),
  bodyJson: bodyJsonSchema.default([]),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: templateTypeEnum.optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyJson: bodyJsonSchema.optional(),
});

const bulkDeleteTemplatesSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const { type, page, limit, search } = req.query;

    if (page !== undefined) {
      const result = await templateService.getPaginated({
        page: parseInt(page as string) || 1,
        limit: parseInt((limit as string) ?? "15") || 15,
        search: (search as string) || undefined,
        type: (type as string) || undefined,
      });
      res.status(200).json({
        data: result.rows,
        pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
      });
      return;
    }

    const result = type
      ? await templateService.getByType(type as string)
      : await templateService.getAll();

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch templates: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

export const bulkDeleteTemplates = async (req: Request, res: Response) => {
  try {
    const parsed = bulkDeleteTemplatesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      return;
    }
    logger.warn(`Bulk template deletion: ids=${parsed.data.ids.join(",")} by user ${req.user?.id}`);
    const deleted = await templateService.deleteMany(parsed.data.ids);
    res.status(200).json({ data: deleted, count: deleted.length });
  } catch (error) {
    logger.error(`Failed to bulk delete templates - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to delete templates" });
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
    logger.error(
      `Failed to fetch template id=${req.params.id}: ${(error as any)?.message}`,
    );
    res.status(500).json({ error: "Failed to fetch template" });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(
        `Template creation validation failed - user ${req.user?.id}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
      );
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await templateService.create({
      ...parsed.data,
      createdBy: req.user.id,
    });
    logger.info(
      `Template created: id=${result.id}, name="${result.name}", type="${result.type}" by user ${req.user.id}`,
    );
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(400).json({ error: "User not found" });
      return;
    }
    logger.error(
      `Failed to create template - user ${req.user?.id}: ${error?.message}`,
    );
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

    logger.info(
      `Template updated: id=${id}, name="${result.name}" by user ${req.user?.id}`,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to update template id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`,
    );
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

    logger.warn(
      `Template deletion requested: id=${id} by user ${req.user?.id}`,
    );
    const result = await templateService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    logger.info(
      `Template deleted: id=${id}, name="${result.name}", type="${result.type}" by user ${req.user?.id}`,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to delete template id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`,
    );
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

    const context = req.body;
    const result = templateEngineService.compileTemplate(
      template.subject,
      template.bodyJson,
      context,
    );

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to preview template id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`,
    );
    res.status(500).json({ error: "Failed to preview template" });
  }
};
