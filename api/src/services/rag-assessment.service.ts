import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { db } from "../db";
import {
  assessmentQuestionOptions,
  assessmentQuestions,
  assessments,
  candidates,
} from "../db/schema";

type RagQuestionType = "multiple_choice" | "true_false" | "short_answer";

interface RagQuestionOption {
  label: string;
  isCorrect: boolean;
}

interface RagQuestion {
  question: string;
  questionType: RagQuestionType;
  options: RagQuestionOption[];
  gradingRubric?: string;
}

const r2Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

function extractKeyFromUrl(resumeUrl: string): string {
  const base = process.env.R2_PUBLIC_URL?.endsWith("/")
    ? process.env.R2_PUBLIC_URL.slice(0, -1)
    : process.env.R2_PUBLIC_URL;

  return resumeUrl.replace(`${base}/`, "");
}

async function downloadPdfFromR2(objectKey: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: objectKey,
  });
  const response = await r2Client.send(command);

  if (!response.Body) {
    throw new Error(`empty response body for key: ${objectKey}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Hugging Face and other libs may print warnings to stdout before the JSON line. */
function extractFirstJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseRagGeneratorStdout(stdout: string): RagQuestion[] {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error("RAG generator produced empty stdout");
  }
  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (Array.isArray(direct)) return direct as RagQuestion[];
  } catch {
    /* HF warnings / other noise may precede JSON */
  }
  const extracted = extractFirstJsonArray(trimmed);
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted) as unknown;
      if (Array.isArray(parsed)) return parsed as RagQuestion[];
    } catch {
      /* try line-by-line below */
    }
  }
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.trim();
    if (!line.startsWith("[")) continue;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (Array.isArray(parsed)) return parsed as RagQuestion[];
    } catch {
      continue;
    }
  }
  throw new Error("could not parse JSON array from RAG stdout");
}

function runRagQuestionGenerator(pdfPath: string): Promise<RagQuestion[]> {
  return new Promise((resolve, reject) => {
    const pythonCmd = process.env.RAG_PYTHON_BIN || "python";
    const scriptPath = path.resolve(
      process.cwd(),
      "..",
      "rag",
      "rag_system_with_langchain.py",
    );
    const child = spawn(
      pythonCmd,
      [scriptPath, "--resume", pdfPath, "--count", "5"],
      {
        env: {
          ...process.env,
          GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
          HF_TOKEN: process.env.HF_TOKEN ?? "",
        },
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `RAG question generator failed with code ${code}. ${stderr || stdout}`,
          ),
        );
        return;
      }

      try {
        resolve(parseRagGeneratorStdout(stdout));
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        reject(new Error(`Invalid JSON from RAG generator: ${msg}`));
      }
    });
  });
}

/** Matches `assessments.description` for RAG-generated individual exams (see marker in createCombinedAssessmentForCandidate). */
export function ragIndividualAssessmentDescriptionRegex(
  candidateId: number,
): string {
  return `^__rag_candidate_${candidateId}_stage_[0-9]+__$`;
}

export const ragAssessmentService = {
  async createCombinedAssessmentForCandidate(
    candidateId: number,
    baseAssessmentId: number,
    stageId: number,
    movedBy: number | null = null,
  ): Promise<number | null> {
    if (!process.env.GROQ_API_KEY) {
      return null;
    }

    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId));

    if (!candidate?.resumeUrl) {
      return null;
    }

    const marker = `__rag_candidate_${candidateId}_stage_${stageId}__`;

    const objectKey = extractKeyFromUrl(candidate.resumeUrl);
    const pdfBuffer = await downloadPdfFromR2(objectKey);

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openats-rag-"));
    const pdfPath = path.join(tempDir, `resume-${randomUUID()}.pdf`);

    try {
      await fs.writeFile(pdfPath, pdfBuffer);
      const generated = await runRagQuestionGenerator(pdfPath);
      const questions = generated.slice(0, 5);

      if (questions.length === 0) {
        return null;
      }

      const [baseAssessment] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.id, baseAssessmentId));

      if (!baseAssessment) {
        return null;
      }

      const [assessment] = await db
        .insert(assessments)
        .values({
          title: `Individual Assessment - ${candidate.firstName} ${candidate.lastName} (${baseAssessment.title})`,
          description: marker,
          timeLimit: baseAssessment.timeLimit,
          passScore: Number(baseAssessment.passScore),
          createdBy: movedBy ?? 1,
        })
        .returning();

      if (!assessment) {
        throw new Error("Failed to create individual assessment");
      }

      const baseQuestions = await db
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.assessmentId, baseAssessment.id))
        .orderBy(assessmentQuestions.position);

      let positionOffset = 0;
      for (const q of baseQuestions) {
        const [savedBaseQuestion] = await db
          .insert(assessmentQuestions)
          .values({
            assessmentId: assessment.id,
            title: q.title,
            description: q.description,
            questionType: q.questionType,
            points: Number(q.points),
            position: q.position,
          })
          .returning();

        if (!savedBaseQuestion) continue;

        const qOptions = await db
          .select()
          .from(assessmentQuestionOptions)
          .where(eq(assessmentQuestionOptions.questionId, q.id))
          .orderBy(assessmentQuestionOptions.position);

        if (qOptions.length > 0) {
          await db.insert(assessmentQuestionOptions).values(
            qOptions.map((opt) => ({
              questionId: savedBaseQuestion.id,
              label: opt.label,
              isCorrect: opt.isCorrect,
              position: opt.position,
            })),
          );
        }
      }
      positionOffset = baseQuestions.length;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]!;
        const isShortAnswer = q.questionType === "short_answer";

        const [savedQuestion] = await db
          .insert(assessmentQuestions)
          .values({
            assessmentId: assessment.id,
            title: q.question,
            description: isShortAnswer
              ? `[AI_GRADED]\n${q.gradingRubric ?? "Evaluate based on technical depth, correctness, and problem-solving clarity."}`
              : "Generated from CV context.",
            questionType: isShortAnswer ? "short_answer" : "multiple_choice",
            points: 20,
            position: positionOffset + i + 1,
          })
          .returning();

        if (!savedQuestion) continue;

        if (!isShortAnswer) {
          let options =
            q.questionType === "true_false"
              ? [
                  { label: "True", isCorrect: q.options.some((o) => o.label.toLowerCase() === "true" && o.isCorrect) },
                  { label: "False", isCorrect: q.options.some((o) => o.label.toLowerCase() === "false" && o.isCorrect) },
                ]
              : q.options.slice(0, 4);

          if (options.every((opt) => !opt.isCorrect) && options.length > 0) {
            options = options.map((opt, idx) => ({
              ...opt,
              isCorrect: idx === 0,
            }));
          }

          if (options.length > 0) {
            await db.insert(assessmentQuestionOptions).values(
              options.map((opt, idx) => ({
                questionId: savedQuestion.id,
                label: opt.label,
                isCorrect: !!opt.isCorrect,
                position: idx + 1,
              })),
            );
          }
        }
      }

      return assessment.id;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  },
};
