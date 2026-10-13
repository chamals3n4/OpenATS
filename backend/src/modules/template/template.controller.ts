import { Request, Response } from "express";
import { previewSystemEmail } from "../../shared/services/system-email-preview";
import { getCompanyForEmail } from "../../shared/services/candidate-mailer";
import { z } from "zod";
import { templateService } from "./template.service";
import { templateEngineService } from "./template-engine.service";
import logger from "../../utils/logger";
import { getErrorCode, getErrorMessage} from "../../utils/error.utils";
import { asEnum } from "../../utils/object.utils";
import { templates } from "../../db/schema";
import {
  SystemEmailError,
  isSystemEmailPurpose,
  systemEmailService,
} from "../../shared/services/system-emails";

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
        type: asEnum(type, templates.type.enumValues),
      });
      res.status(200).json({
        data: result.rows,
        pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
      });
      return;
    }

    const narrowedType = asEnum(type, templates.type.enumValues);
    const result = narrowedType
      ? await templateService.getByType(narrowedType)
      : await templateService.getAll();

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch templates: ${getErrorMessage(error)}`);
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
    logger.error(`Failed to bulk delete templates - user ${req.user?.id}: ${getErrorMessage(error)}`);
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
      `Failed to fetch template id=${req.params.id}: ${getErrorMessage(error)}`,
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
  } catch (error) {
    if (getErrorCode(error) === "23503") {
      res.status(400).json({ error: "User not found" });
      return;
    }
    logger.error(
      `Failed to create template - user ${req.user?.id}: ${getErrorMessage(error)}`,
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
      `Failed to update template id=${req.params.id} - user ${req.user?.id}: ${getErrorMessage(error)}`,
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
      `Failed to delete template id=${req.params.id} - user ${req.user?.id}: ${getErrorMessage(error)}`,
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
      `Failed to preview template id=${req.params.id} - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to preview template" });
  }
};

const systemEmailSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(500),
  bodyHtml: z.string().trim().min(1, "Message is required").max(50_000),
});

// Looser than saving: a half-written email, even an empty one, can still be previewed.
const systemEmailPreviewSchema = z.object({
  subject: z.string().max(500),
  bodyHtml: z.string().max(50_000),
});

export const listSystemEmails = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ data: await systemEmailService.list() });
  } catch (error) {
    logger.error(`Failed to list system emails: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to load the automatic emails" });
  }
};

export const saveSystemEmail = async (req: Request, res: Response) => {
  const purpose = String(req.params.purpose ?? "");
  if (!isSystemEmailPurpose(purpose)) {
    res.status(404).json({ error: "No such automatic email" });
    return;
  }
  const parsed = systemEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Validation failed" });
    return;
  }
  try {
    await systemEmailService.save(purpose, parsed.data, req.user.id);
    res.status(200).json({ data: { purpose } });
  } catch (error) {
    if (error instanceof SystemEmailError) {
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error(`Failed to save system email ${purpose}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to save the email" });
  }
};

/**
 * The email as a candidate would receive it, with the wording being typed and made-up details.
 * Nothing is saved, so anyone who may open the editor may see it. An unknown {{variable}} is not
 * an error here: it shows in the preview as typed, which is what tells the person it is wrong.
 */
export const previewSystemEmailHandler = async (req: Request, res: Response) => {
  const purpose = String(req.params.purpose ?? "");
  if (!isSystemEmailPurpose(purpose)) {
    res.status(404).json({ error: "No such automatic email" });
    return;
  }
  const parsed = systemEmailPreviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Validation failed" });
    return;
  }
  try {
    const email = previewSystemEmail(purpose, parsed.data, await getCompanyForEmail());
    res.status(200).json({ data: email });
  } catch (error) {
    logger.error(`Failed to preview system email ${purpose}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to build the preview" });
  }
};

export const resetSystemEmail = async (req: Request, res: Response) => {
  const purpose = String(req.params.purpose ?? "");
  if (!isSystemEmailPurpose(purpose)) {
    res.status(404).json({ error: "No such automatic email" });
    return;
  }
  try {
    await systemEmailService.reset(purpose);
    res.status(200).json({ data: { purpose } });
  } catch (error) {
    logger.error(`Failed to reset system email ${purpose}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to reset the email" });
  }
};
