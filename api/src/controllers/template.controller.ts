import { Request, Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { candidates, jobs } from "../db/schema";
import { templateService } from "../services/template.service";
import { templateEngineService } from "../services/template-engine.service";
import type { TemplateContext } from "../services/template-engine.service";
import { variableService } from "../services/variable.service";
import { mailService } from "../services/mail.service";
import logger from "../utils/logger";

/** Postgres rejects new template_type values if migration 0004 never ran. */
function isMissingTemplateTypeEnumError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /invalid input value for enum/i.test(msg) && /template_type/i.test(msg);
}

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
  "general",
  "application_received",
  "assessment_completion",
  "interview_invite",
]);

/**
 * UI builder sends button/image as `{ type, content }`; DB & engine expect
 * button `{ label, url }` and image `{ url, alt? }`.
 */
function normalizeTemplateBodyJson(body: unknown): unknown {
  if (!Array.isArray(body)) return [];
  return body.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const b = raw as Record<string, unknown>;
    const type = b.type;
    if (type === "heading" || type === "text") {
      return {
        type,
        content:
          typeof b.content === "string" ? b.content : String(b.content ?? ""),
      };
    }
    if (type === "button" && "content" in b && typeof b.content === "string") {
      if ("label" in b && "url" in b) return raw;
      return {
        type: "button",
        label: b.content,
        url: typeof b.url === "string" && b.url.length > 0 ? b.url : "#",
      };
    }
    if (type === "image") {
      if (typeof b.url === "string") return raw;
      if ("content" in b) {
        return {
          type: "image",
          url: String(b.content ?? ""),
          alt: typeof b.alt === "string" ? b.alt : "",
        };
      }
    }
    if (type === "divider") {
      return { type: "divider" };
    }
    if (type === "spacer") {
      let height = 24;
      if (
        typeof b.height === "number" &&
        Number.isFinite(b.height) &&
        b.height > 0
      ) {
        height = b.height;
      } else if (typeof b.content === "string") {
        const n = parseInt(b.content, 10);
        if (Number.isFinite(n) && n > 0) height = n;
      }
      return { type: "spacer", height };
    }
    return raw;
  });
}

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: templateTypeEnum,
  subject: z.string().max(500).default(""),
  bodyJson: z.array(contentBlockSchema).default([]),
  isDefault: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: templateTypeEnum.optional(),
  subject: z.string().max(500).optional(),
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
    logger.error(
      `Failed to fetch template id=${req.params.id}: ${(error as any)?.message}`,
    );
    res.status(500).json({ error: "Failed to fetch template" });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const body = {
      ...req.body,
      bodyJson: normalizeTemplateBodyJson(req.body?.bodyJson),
    };
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      logger.warn(
        `Template creation validation failed - user ${req.user?.id}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
      );
      res.status(400).json({
        error: first?.message ?? "Validation failed",
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
      res.status(400).json({
        error:
          "Your account is not linked in the database yet. Sign out and sign in again, or contact an admin.",
      });
      return;
    }
    if (error?.code === "42703") {
      res.status(500).json({
        error:
          "Database is missing a required column (e.g. templates.is_default). Run drizzle migrations from the api folder, then restart the API.",
      });
      return;
    }
    logger.error(
      `Failed to create template - user ${req.user?.id}: ${error?.message}`,
    );
    if (isMissingTemplateTypeEnumError(error)) {
      res.status(500).json({
        error:
          "Database enum template_type is missing values (e.g. interview_invite). From the api folder run: pnpm exec drizzle-kit migrate, then retry.",
      });
      return;
    }
    const msg =
      typeof error?.message === "string" && error.message.length > 0
        ? error.message
        : "Failed to create template";
    res.status(500).json({ error: msg });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid template ID" });
      return;
    }

    const body =
      req.body?.bodyJson !== undefined
        ? {
            ...req.body,
            bodyJson: normalizeTemplateBodyJson(req.body.bodyJson),
          }
        : req.body;
    const parsed = updateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      res.status(400).json({
        error: first?.message ?? "Validation failed",
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
  } catch (error: any) {
    logger.error(
      `Failed to update template id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`,
    );
    if (error?.code === "42703") {
      res.status(500).json({
        error:
          "Database is missing a required column (e.g. templates.is_default). Run drizzle migrations from the api folder, then restart the API.",
      });
      return;
    }
    if (isMissingTemplateTypeEnumError(error)) {
      res.status(500).json({
        error:
          "Database enum template_type is missing values (e.g. interview_invite). From the api folder run: pnpm exec drizzle-kit migrate, then retry.",
      });
      return;
    }
    const msg =
      typeof error?.message === "string" && error.message.length > 0
        ? error.message
        : "Failed to update template";
    res.status(500).json({ error: msg });
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

    const raw = req.body as Record<string, unknown> | null | undefined;
    let context: TemplateContext = {};

    const parseCandidateId = (v: unknown): number | undefined => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      return undefined;
    };

    if (raw && typeof raw === "object") {
      const cid = parseCandidateId(raw.candidateId);
      if (cid != null) {
        context = await variableService.getContextForTemplatePreview(
          cid,
          template.type,
        );
        const extra = raw.context;
        if (extra && typeof extra === "object") {
          context = { ...context, ...(extra as TemplateContext) };
        }
      } else if (
        "context" in raw &&
        raw.context &&
        typeof raw.context === "object"
      ) {
        context = raw.context as TemplateContext;
      } else if (!("candidateId" in raw)) {
        context = raw as TemplateContext;
      }
    }

    let result: ReturnType<typeof templateEngineService.compileTemplate>;

    if (template.type === "offer") {
      let jobDescriptionHtml: string | null = null;
      const previewCid =
        raw && typeof raw === "object"
          ? parseCandidateId(raw.candidateId)
          : undefined;
      if (previewCid != null) {
        const [c] = await db
          .select({ jobId: candidates.jobId })
          .from(candidates)
          .where(eq(candidates.id, previewCid))
          .limit(1);
        if (c?.jobId != null) {
          const [j] = await db
            .select({ description: jobs.description })
            .from(jobs)
            .where(eq(jobs.id, c.jobId))
            .limit(1);
          jobDescriptionHtml = j?.description ?? null;
        }
      }

      const html = templateEngineService.renderOfferEmailBodyHTML(
        template.bodyJson,
        context,
        { jobDescriptionHtml },
      );

      result = {
        subject: templateEngineService.replaceVariables(
          template.subject,
          context,
        ),
        bodyJson: templateEngineService.renderJSON(
          template.bodyJson,
          context,
        ),
        html,
      };
    } else {
      result = templateEngineService.compileTemplate(
        template.subject,
        template.bodyJson,
        context,
      );
    }

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to preview template id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`,
    );
    res.status(500).json({ error: "Failed to preview template" });
  }
};

/**
 * Existing dev-branch endpoint kept on `/templates/send-email`.
 * Sends an ad-hoc email to a candidate (general or interview), optionally driven by a template.
 */
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

    const { candidateId, mode, subject, body, interview } = parsed.data;
    let effectiveTemplateId: number | null = parsed.data.templateId ?? null;
    if (effectiveTemplateId == null) {
      effectiveTemplateId =
        (mode === "interview"
          ? await templateService.getDefaultTemplateIdForType(
              "interview_invite",
            )
          : await templateService.getDefaultTemplateIdForType("general")) ??
        null;
    }

    const context = await variableService.getContextForCandidate(candidateId);
    if (!context.candidate_name) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    const candidateName = String(context.candidate_name ?? "").trim();
    const [firstName, ...restName] = candidateName.split(" ");
    const candidateFirstName = firstName || candidateName || "Candidate";
    const candidateLastName = restName.join(" ").trim();

    const interviewersJoined =
      interview?.interviewers?.filter(Boolean).join(", ") ?? "";
    const mergedInterviewers = [
      interviewersJoined,
      interview?.otherInterviewers ?? "",
    ]
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

    let finalSubject = templateEngineService.replaceVariables(
      subject,
      emailContext,
    );
    let html = body?.trim()
      ? templateEngineService
          .replaceVariables(body, emailContext)
          .replace(/\n/g, "<br>")
      : "";

    if (effectiveTemplateId != null) {
      const template = await templateService.getById(effectiveTemplateId);
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
      `Candidate ${mode} email sent: candidateId=${candidateId}, templateId=${effectiveTemplateId ?? "none"}, user=${req.user?.id}`,
    );
    res.status(200).json({ data: { ok: true } });
  } catch (error) {
    logger.error(
      `Failed to send candidate email - user ${req.user?.id}: ${(error as any)?.message}`,
    );
    res.status(500).json({ error: "Failed to send candidate email" });
  }
};
