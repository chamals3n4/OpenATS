import { Request, Response } from "express";
import { z } from "zod";
import { templateService } from "../services/template.service";
import { templateEngineService } from "../services/template-engine.service";
import { variableService } from "../services/variable.service";
import { mailService } from "../services/mail.service";
import logger from "../utils/logger";

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
  "offer_withdrawal",
  "rejection",
  "assessment_invite",
  "assessment_completion",
  "interview_invite",
  "general",
  "application_received",
]);

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: templateTypeEnum,
  subject: z.string().min(1, "Subject is required").max(500),
  bodyJson: z.array(contentBlockSchema).default([]),
  isDefault: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: templateTypeEnum.optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyJson: z.array(contentBlockSchema).optional(),
  isDefault: z.boolean().optional(),
});

const sendCandidateEmailSchema = z.object({
  candidateId: z.number().int().positive(),
  mode: z.enum(["general", "interview"]),
  templateId: z.number().int().positive().optional().nullable(),
  subject: z.string().min(1).max(500),
  body: z.string().optional().default(""),
  interview: z
    .object({
      date: z.string().optional(),
      time: z.string().optional(),
      timeZone: z.string().optional(),
      location: z.string().optional(),
      videoLink: z.string().optional(),
      interviewers: z.array(z.string()).optional(),
      otherInterviewers: z.string().optional(),
    })
    .optional(),
});

export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    const result = type
      ? await templateService.getByType(type as string)
      : await templateService.getAll();

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch templates: ${(error as any)?.message}`);
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
    logger.error(`Failed to fetch template id=${req.params.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch template" });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(`Template creation validation failed - user ${req.user?.id}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
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
    logger.info(`Template created: id=${result.id}, name="${result.name}", type="${result.type}" by user ${req.user.id}`);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(400).json({ error: "User not found" });
      return;
    }
    logger.error(`Failed to create template - user ${req.user?.id}: ${error?.message}`);
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

    logger.info(`Template updated: id=${id}, name="${result.name}" by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to update template id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`);
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

    logger.warn(`Template deletion requested: id=${id} by user ${req.user?.id}`);
    const result = await templateService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    logger.info(`Template deleted: id=${id}, name="${result.name}", type="${result.type}" by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to delete template id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`);
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
      context
    );

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to preview template id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to preview template" });
  }
};

export const sendCandidateEmail = async (req: Request, res: Response) => {
  try {
    const parsed = sendCandidateEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { candidateId, mode, templateId, subject, body, interview } = parsed.data;
    const context = await variableService.getContextForCandidate(candidateId);
    if (!context.candidate_name) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    const candidateName = String(context.candidate_name ?? "").trim();
    const [firstName, ...restName] = candidateName.split(" ");
    const candidateFirstName = firstName || candidateName || "Candidate";
    const candidateLastName = restName.join(" ").trim();

    const interviewersJoined = interview?.interviewers?.filter(Boolean).join(", ") ?? "";
    const mergedInterviewers = [interviewersJoined, interview?.otherInterviewers ?? ""]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");

    const emailContext = {
      ...context,
      candidate_name: candidateName,
      candidate_first_name: candidateFirstName,
      candidate_last_name: candidateLastName,
      interview_date: interview?.date ?? "",
      interview_time: interview?.time ?? "",
      interview_timezone: interview?.timeZone ?? "",
      interview_location: interview?.location ?? "",
      interview_video_link: interview?.videoLink ?? "",
      interview_interviewers: mergedInterviewers,
    };

    let finalSubject = templateEngineService.replaceVariables(subject, emailContext);
    let html = body?.trim()
      ? templateEngineService.replaceVariables(body, emailContext).replace(/\n/g, "<br>")
      : "";

    if (templateId) {
      const template = await templateService.getById(templateId);
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      const compiled = templateEngineService.compileTemplate(
        template.subject,
        template.bodyJson,
        emailContext,
      );
      finalSubject = compiled.subject;
      html = compiled.html;
    }

    if (!finalSubject.trim()) {
      res.status(400).json({ error: "Email subject is required" });
      return;
    }
    if (!html.trim()) {
      res.status(400).json({ error: "Email body is required" });
      return;
    }

    const to = String((context as { email?: string }).email ?? "").trim();
    if (!to) {
      res.status(400).json({ error: "Candidate email is missing" });
      return;
    }

    await mailService.sendEmail({ to, subject: finalSubject, html });
    logger.info(
      `Candidate ${mode} email sent: candidateId=${candidateId}, templateId=${templateId ?? "none"}, user=${req.user?.id}`,
    );
    res.status(200).json({ data: { ok: true } });
  } catch (error) {
    logger.error(
      `Failed to send candidate email - user ${req.user?.id}: ${(error as any)?.message}`,
    );
    res.status(500).json({ error: "Failed to send candidate email" });
  }
};
