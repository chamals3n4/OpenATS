import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GoogleGenAI } from "@google/genai";
import { eq } from "drizzle-orm";
import { candidateCvAnalysis, db } from "../db";
import { CandidateCvAnalysis, jobSkills, jobs } from "../db";
import logger from "../utils/logger";

const r2Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type JobLevel =
  | "intern"
  | "entry"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | null;

type DocumentType =
  | "resume"
  | "cv"
  | "cover_letter"
  | "certificate"
  | "transcript"
  | "assignment"
  | "lab_sheet"
  | "invoice"
  | "id_document"
  | "other";

interface ParsedCv {
  documentType: DocumentType;
  isCvOrResume: boolean;
  confidence: number; // 0..1
  rationale: string[];

  listedSkills: string[];
  projectTechnologies: string[];

  certifications: string[];

  totalExperienceYears: number;
  jobLevel: JobLevel;
}

interface ParsedJd {
  minExperienceYears: number;
  jobLevel: JobLevel;
  requiredCertifications: string[];
}

interface JobRequirements {
  skills: string[];
  minExperienceYears: number;
  jobLevel: JobLevel;
  requiredCertifications: string[];
}

interface ScoreResult {
  matchScore: number;
  matchedSkills: string[]; // green in ui
  missingSkills: string[]; // red in UI
  scoreBreakdown: {
    skills: number;
    experience: number;
    level: number;
    certs: number;
  };
}

function extractKeyFromUrl(resumeUrl: string): string {
  const base = process.env.R2_PUBLIC_URL?.endsWith("/")
    ? process.env.R2_PUBLIC_URL.slice(0, -1)
    : process.env.R2_PUBLIC_URL;

  return resumeUrl.replace(`${base}/`, "");
}

// download pdf bytes from r2
async function downloadPdfFromR2(objectKey: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: objectKey,
  });
  const response = await r2Client.send(command);

  if (!response.Body) {
    throw new Error(`empty response body for key : ${objectKey}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function ParsedCvWithGemini(pdfBuffer: Buffer): Promise<ParsedCv> {
  const prompt = [
    "You are a strict CV/resume parser and document classifier.",
    "",
    "First decide whether the attached PDF is a CV/resume.",
    "Only if it is a CV/resume, extract candidate information.",
    "",
    "Important:",
    "- Many PDFs are NOT CVs (e.g., lab sheets, assignments, invoices, certificates, transcripts).",
    "- Do NOT hallucinate skills, experience, certifications, or job level.",
    "- If the document is not a CV/resume, return empty arrays and zeros for extraction fields.",
    "Return ONLY a valid JSON object — no explanation, no markdown, no code fences.",
    "",
    "JSON schema to return:",
    "{",
    '  "documentType": "resume",',
    '  "isCvOrResume": true,',
    '  "confidence": 0.0,',
    '  "rationale": ["short reason 1", "short reason 2"],',
    '  "listedSkills": ["skill1", "skill2"],',
    '  "projectTechnologies": ["tech1", "tech2"],',
    '  "certifications": ["cert1", "cert2"],',
    '  "totalExperienceYears": 1.5,',
    '  "jobLevel": "entry"',
    "}",
    "",
    "documentType:",
    '  - One of: "resume","cv","cover_letter","certificate","transcript","assignment","lab_sheet","invoice","id_document","other"',
    "",
    "isCvOrResume:",
    "  - true ONLY if the PDF is a candidate resume/CV (work history, education, projects, skills, contact info).",
    "  - false if it is anything else (lab sheet, assignment, exam paper, course handout, certificate PDF, transcript, invoice).",
    "",
    "confidence:",
    "  - A number from 0 to 1 indicating confidence in the classification.",
    "",
    "rationale:",
    "  - 1 to 5 short bullet reasons (strings) explaining the classification.",
    "",
    "Field rules:",
    "",
    "listedSkills:",
    "  - Extract skills/technologies mentioned ANYWHERE in the CV (skills section, experience bullets, projects, education, tools).",
    "  - Include programming languages, frameworks, libraries, tools, platforms, databases, cloud services, methodologies.",
    "  - Keep items short (e.g., 'React', 'PostgreSQL', 'Docker').",
    "  - Do not include generic words like 'project', 'team', 'lab', 'assignment'.",
    "",
    "projectTechnologies:",
    "  - Extract technologies mentioned in project descriptions, side projects,",
    "    open source contributions, hackathon entries, academic projects, GitHub work",
    "  - Example: 'Built a REST API using Node.js and MongoDB' → ['Node.js', 'MongoDB']",
    "  - Do NOT repeat items already in listedSkills",
    "  - Use empty array [] if no projects are mentioned",
    "",
    "certifications:",
    "  - Extract formal certifications/licences/credentials the candidate HOLDS.",
    "  - Only include an item if the document indicates the candidate is the holder/recipient.",
    "  - Prefer professional certifications (AWS, Azure, Google Cloud, PMP, etc.).",
    "  - Do NOT include random course topics, lab sheets, module names, or assignment titles as certifications.",
    "  - If unsure whether something is a real certification, do NOT include it.",
    "  - Use empty array [] if none found.",
    "",
    "totalExperienceYears:",
    "  - Calculate total years of professional work experience as a decimal number",
    "  - Example: 2 years 6 months = 2.5",
    "  - Include internships and part-time work",
    "  - Use 0 if the candidate is a student with no work experience",
    "",
    "jobLevel:",
    "  - Determine the candidate's overall career level",
    "  - Must be one of:",
    '    "intern"  → currently a student, applying for internship, no full-time experience',
    '    "entry"   → fresh graduate or less than 1 year of full-time experience',
    '    "junior"  → 1 to 2 years of experience',
    '    "mid"     → 3 to 5 years of experience',
    '    "senior"  → 6 to 9 years of experience',
    '    "lead"    → 10+ years or holds lead/principal/architect/staff titles',
    "    null      → cannot be determined from the CV",
    "",
    "If isCvOrResume is false:",
    "  - listedSkills: []",
    "  - projectTechnologies: []",
    "  - certifications: []",
    "  - totalExperienceYears: 0",
    "  - jobLevel: null",
  ].join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        text: prompt,
      },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBuffer.toString("base64"),
        },
      },
    ],
  });

  let raw = response.text?.trim() ?? "";

  // strip markdown code fences
  if (raw.startsWith("```")) {
    const parts = raw.split("```");
    raw = parts[1] ?? "";
    if (raw.startsWith("json")) raw = raw.slice(4);
    raw = raw.trim();
  }

  return JSON.parse(raw) as ParsedCv;
}

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9+.#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCertName(s: string): string {
  const n = normalizeToken(s);
  return n
    .replace(/\baws\b/g, "amazon web services")
    .replace(/\bgcp\b/g, "google cloud")
    .replace(/\bazure\b/g, "microsoft azure")
    .trim();
}

function hasCertMatch(candidateCerts: string[], requiredCert: string): boolean {
  const req = normalizeCertName(requiredCert);
  if (!req) return false;
  const cand = candidateCerts.map(normalizeCertName);
  if (cand.includes(req)) return true;
  return cand.some((c) => c.includes(req) || req.includes(c));
}

async function parseJdWithGemini(description: string): Promise<ParsedJd> {
  const prompt = [
    "You are a job description analyser.",
    "",
    "Extract the following requirements from the job description below.",
    "Return ONLY a valid JSON object — no explanation, no markdown, no code fences.",
    "",
    "JSON schema to return:",
    "{",
    '  "minExperienceYears": 3,',
    '  "jobLevel": "senior",',
    '  "requiredCertifications": ["cert1"]',
    "}",
    "",
    "Field rules:",
    "",
    "minExperienceYears:",
    "  - Minimum years of experience required as a number",
    "  - Examples: '3+ years' → 3, 'at least 2 years' → 2",
    "  - Use 0 if not mentioned or if it is an internship or entry-level role",
    "",
    "jobLevel:",
    "  - The required career level — must be one of:",
    '    "intern"  → internship role, student position, industrial training',
    '    "entry"   → fresh graduate welcome, entry-level, 0 to 1 year required',
    '    "junior"  → junior role, 1 to 2 years required',
    '    "mid"     → mid-level, 3 to 5 years required',
    '    "senior"  → senior role, 5+ years required',
    '    "lead"    → lead, principal, architect, staff engineer',
    "    null      → cannot be determined from the description",
    "",
    "requiredCertifications:",
    "  - Certifications that are required or preferred",
    "  - Example: ['AWS Certified Developer', 'PMP']",
    "  - Use empty array [] if none mentioned",
    "",
    "JOB DESCRIPTION:",
    description,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ text: prompt }],
  });

  let raw = response.text?.trim() ?? "";

  if (raw.startsWith("```")) {
    const parts = raw.split("```");
    raw = parts[1] ?? "";
    if (raw.startsWith("json")) raw = raw.slice(4);
    raw = raw.trim();
  }

  return JSON.parse(raw) as ParsedJd;
}

function scoreCV(parsedCv: ParsedCv, jobReqs: JobRequirements): ScoreResult {
  /*
    Scoring is based on four dimensions, each with a fixed weight:
   
      Skills      55 pts  — compares job's required skills (from jobSkills table)
                            against ALL technologies found in the CV, including
                            both the skills section and project descriptions.
   
      Experience  25 pts  — compares the minimum years required in the JD
                            against the candidate's total work experience.
                            Capped at 25 — having more years gives no extra points.
   
      Job level   15 pts  — compares the required seniority level in the JD
                            against the candidate's inferred level from their CV.
                            Exact match = 15, one level off = 7, two+ off = 0.
                            Intern/entry roles penalise overqualified candidates too.
   
      Certs        5 pts  — compares certifications required in the JD
                            against certifications the candidate holds.
                            Low weight since certs are rarely hard requirements.
   
    If a dimension has no requirement defined (e.g. no skills added to the job,
    or JD doesn't mention experience), that dimension gives full marks automatically.
   
    Final score is the sum of all four, rounded to the nearest integer (0–100).
   */
  const allCandidateTech = [
    ...parsedCv.listedSkills,
    ...parsedCv.projectTechnologies,
  ];

  const cvSkillsSet = new Set(
    allCandidateTech.map((s) => s.toLowerCase().trim()),
  );

  const reqSkillsNormalised = jobReqs.skills.map((s) => s.toLowerCase().trim());

  const matchedSkills = jobReqs.skills.filter((_, i) =>
    cvSkillsSet.has(reqSkillsNormalised[i]!),
  );
  const missingSkills = jobReqs.skills.filter(
    (_, i) => !cvSkillsSet.has(reqSkillsNormalised[i]!),
  );

  const skillsScore =
    jobReqs.skills.length > 0
      ? (matchedSkills.length / jobReqs.skills.length) * 55
      : 55;

  const expScore =
    jobReqs.minExperienceYears > 0
      ? Math.min(
          parsedCv.totalExperienceYears / jobReqs.minExperienceYears,
          1,
        ) * 25
      : 25;

  const jobLevelTiers: Record<string, number> = {
    intern: 1,
    entry: 2,
    junior: 3,
    mid: 4,
    senior: 5,
    lead: 6,
  };

  const candidateTier = jobLevelTiers[parsedCv.jobLevel ?? ""] ?? 0;
  const requiredTier = jobLevelTiers[jobReqs.jobLevel ?? ""] ?? 0;

  let levelScore: number;

  if (requiredTier === 0) {
    levelScore = 15;
  } else if (requiredTier <= 2) {
    if (candidateTier === requiredTier) {
      levelScore = 15;
    } else if (Math.abs(candidateTier - requiredTier) === 1) {
      levelScore = 7;
    } else {
      levelScore = 0;
    }
  } else {
    if (candidateTier >= requiredTier) {
      levelScore = 15;
    } else if (candidateTier === requiredTier - 1) {
      levelScore = 7;
    } else {
      levelScore = 0;
    }
  }

  const cvCertsSet = new Set(
    parsedCv.certifications.map((c) => normalizeCertName(c)),
  );

  const certScore =
    jobReqs.requiredCertifications.length > 0
      ? (jobReqs.requiredCertifications.filter((c) => {
          const n = normalizeCertName(c);
          return cvCertsSet.has(n) || hasCertMatch(parsedCv.certifications, c);
        }).length /
          jobReqs.requiredCertifications.length) *
        5
      : 5;
  return {
    matchScore: Math.round(skillsScore + expScore + levelScore + certScore),
    matchedSkills,
    missingSkills,
    scoreBreakdown: {
      skills: Math.round(skillsScore),
      experience: Math.round(expScore),
      level: Math.round(levelScore),
      certs: Math.round(certScore),
    },
  };
}

export const cvAnalysisService = {
  async analyze(
    candidateId: number,
    jobId: number,
    resumeUrl: string,
  ): Promise<void> {
    await db
      .insert(candidateCvAnalysis)
      .values({ candidateId, jobId, status: "pending" })
      .onConflictDoUpdate({
        target: candidateCvAnalysis.candidateId,
        set: {
          jobId,
          status: "pending",
          matchScore: null,
          matchedSkills: null,
          missingSkills: null,
          extractedText: null,
          errorMessage: null,
          updatedAt: new Date(),
        },
      });

    logger.info(
      `[CV Analysis] Started for candidate ${candidateId}, job ${jobId}`,
    );

    try {
      const [jobRow] = await db
        .select({ description: jobs.description })
        .from(jobs)
        .where(eq(jobs.id, jobId));

      const jobSkillRows = await db
        .select({ skill: jobSkills.skill })
        .from(jobSkills)
        .where(eq(jobSkills.jobId, jobId));

      logger.info(
        `[CV Analysis] Job has ${jobSkillRows.length} required skills`,
      );

      const objectKey = extractKeyFromUrl(resumeUrl);
      const pdfBuffer = await downloadPdfFromR2(objectKey);

      logger.info(`[CV Analysis] PDF downloaded (${pdfBuffer.length} bytes)`);

      const [parsedCv, parsedJd] = await Promise.all([
        ParsedCvWithGemini(pdfBuffer),

        jobRow?.description
          ? parseJdWithGemini(jobRow.description)
          : Promise.resolve<ParsedJd>({
              minExperienceYears: 0,
              jobLevel: null,
              requiredCertifications: [],
            }),
      ]);

      logger.info(
        `[CV Analysis] CV parsed — ${parsedCv.listedSkills.length} listed skills, ${parsedCv.projectTechnologies.length} project techs, level: ${parsedCv.jobLevel}`,
      );
      logger.info(
        `[CV Analysis] Document type: ${parsedCv.documentType} isCvOrResume=${parsedCv.isCvOrResume} confidence=${parsedCv.confidence}`,
      );
      logger.info(
        `[CV Analysis] JD parsed — min exp: ${parsedJd.minExperienceYears}yrs, level: ${parsedJd.jobLevel}`,
      );

      if (!parsedCv.isCvOrResume || parsedCv.confidence < 0.6) {
        throw new Error(
          `Uploaded document doesn't look like a CV/resume (type: ${parsedCv.documentType}, confidence: ${parsedCv.confidence}). Please upload a resume/CV PDF.`,
        );
      }

      const jobReqs: JobRequirements = {
        skills: jobSkillRows.map((r) => r.skill),
        minExperienceYears: parsedJd.minExperienceYears,
        jobLevel: parsedJd.jobLevel,
        requiredCertifications: parsedJd.requiredCertifications,
      };

      const { matchScore, matchedSkills, missingSkills, scoreBreakdown } =
        scoreCV(parsedCv, jobReqs);

      logger.info(
        `[CV Analysis] Score: ${matchScore}/100 — matched: [${matchedSkills}] missing: [${missingSkills}]`,
      );

      await db
        .update(candidateCvAnalysis)
        .set({
          status: "done",
          matchScore,
          matchedSkills,
          missingSkills,
          scoreBreakdown,
          updatedAt: new Date(),
        })
        .where(eq(candidateCvAnalysis.candidateId, candidateId));

      logger.info(
        `[CV Analysis] Done for candidate ${candidateId} — score: ${matchScore}`,
      );
    } catch (error: any) {
      logger.error(`[CV Analysis] Failed for candidate ${candidateId}:`, error);

      await db
        .update(candidateCvAnalysis)
        .set({
          status: "failed",
          errorMessage: error?.message ?? "Unknown error during CV analysis",
          updatedAt: new Date(),
        })
        .where(eq(candidateCvAnalysis.candidateId, candidateId));
    }
  },
};
