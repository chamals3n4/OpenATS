import { Router } from "express";
import { z } from "zod";
import { rejectionService } from "../services/rejection.service";
import { templateEngineService } from "../services/template-engine.service";
import { variableService } from "../services/variable.service";
import { db } from "../db";
import { templates, candidates } from "../db/schema";
import { eq } from "drizzle-orm";
import logger from "../utils/logger";

const router: Router = Router();

// ── Rejection routes ───────────────────────────────────────────────────────

const rejectSchema = z
  .object({
    reason: z.string().trim().min(1, "Reason is required").max(255),
    internalNote: z.string().max(2000).optional().nullable(),
    templateId: z.number().int().positive().optional().nullable(),
    emailStatus: z.enum(["not_sent", "draft", "sent"]).default("not_sent"),
  })
  .refine((value) => value.emailStatus !== "sent" || !!value.templateId, {
    path: ["templateId"],
    message: "Template is required when sending email",
  });

// POST /candidates/:id/reject — reject a candidate
router.post("/candidates/:id/reject", async (req, res) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    // Look up candidate for email and context
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));

    if (!candidate) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    // If sending email with a template, render it for preview/reference
    let renderedSubject = "";
    let renderedHtml = "";

    if (parsed.data.templateId && parsed.data.emailStatus === "sent") {
      const [template] = await db
        .select()
        .from(templates)
        .where(eq(templates.id, parsed.data.templateId));

      if (template) {
        const context = await variableService.getContextForCandidate(id);
        const compiled = templateEngineService.compileTemplate(
          template.subject,
          template.bodyJson,
          context,
        );
        renderedSubject = compiled.subject;
        renderedHtml = compiled.html;
      }
    }

    const rejection = await rejectionService.reject(
      {
        candidateId: id,
        jobId: candidate.jobId,
        fromStageId: candidate.currentStageId,
        reason: parsed.data.reason,
        internalNote: parsed.data.internalNote ?? null,
        templateId: parsed.data.templateId ?? null,
        emailStatus: parsed.data.emailStatus,
      },
      req.user.id,
    );

    res.status(201).json({
      data: {
        ...rejection,
        renderedSubject: renderedSubject || null,
        renderedHtml: renderedHtml || null,
      },
    });
  } catch (error: any) {
    logger.error(`Failed to reject candidate ${req.params.id}: ${error.message}`);
    res.status(400).json({ error: error.message || "Failed to reject candidate" });
  }
});

// POST /candidates/:id/unreject — restore a rejected candidate
router.post("/candidates/:id/unreject", async (req, res) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const result = await rejectionService.unreject(id, req.user.id);
    res.status(200).json({ data: result });
  } catch (error: any) {
    logger.error(`Failed to unreject candidate ${req.params.id}: ${error.message}`);
    res.status(400).json({ error: error.message || "Failed to unreject candidate" });
  }
});

// GET /candidates/:id/rejections — get rejection history
router.get("/candidates/:id/rejections", async (req, res) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const rejections = await rejectionService.getByCandidate(id);
    res.status(200).json({ data: rejections });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch rejections" });
  }
});

// POST /templates/:id/preview — preview a rendered template for a candidate
router.post("/templates/:id/preview", async (req, res) => {
  try {
    const templateId = parseInt((req.params.id ?? "").toString());
    const candidateId = req.body?.candidateId
      ? parseInt(req.body.candidateId)
      : undefined;

    if (isNaN(templateId)) {
      res.status(400).json({ error: "Invalid template ID" });
      return;
    }

    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId));

    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    // Use candidate context if provided
    const context = candidateId
      ? await variableService.getContextForCandidate(candidateId)
      : { candidate_name: "John Doe", job_title: "Software Engineer", company_name: "Your Company" };

    const compiled = templateEngineService.compileTemplate(
      template.subject,
      template.bodyJson,
      context,
    );

    res.status(200).json({
      data: {
        subject: compiled.subject,
        html: compiled.html,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to preview template" });
  }
});

export default router;
