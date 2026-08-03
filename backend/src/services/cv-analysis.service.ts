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

const GEMINI_TIMEOUT_MS = 30_000;

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
  impliedSkills: string[];

  certifications: string[];

  totalExperienceYears: number;
  jobLevel: JobLevel;
}

export interface AiSummary {
  quickSummary: string;
  strengths: string[];
  gaps: string[];
  hiringSignal: string;
  verdict: "strong_fit" | "moderate_fit" | "weak_fit" | "not_recommended";
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
  aiSummary: AiSummary | null;
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
    '  "impliedSkills": ["Git"],',
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
    "  - Extract skills/technologies explicitly mentioned ANYWHERE in the CV (skills section, experience bullets, projects, education, tools).",
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
    "impliedSkills:",
    "  - Skills that can be INFERRED from strong contextual evidence, not explicitly stated.",
    "  - RULES (apply all that match):",
    "    * If the candidate lists github.com URLs (profile or project repos) → add 'Git'",
    "    * If the candidate lists gitlab.com URLs → add 'Git'",
    "    * If the candidate lists bitbucket.org URLs → add 'Git'",
    "    * If projects are hosted on Vercel, Netlify, or Heroku → add 'CI/CD' if not already listed",
    "    * If the candidate built and deployed a web app but did not list HTML/CSS → add 'HTML', 'CSS'",
    "    * If they used Firebase → add 'NoSQL' if not already listed",
    "  - Do NOT add skills already present in listedSkills or projectTechnologies.",
    "  - Do NOT infer speculatively — only add when evidence is clear and direct.",
    "  - Use empty array [] if no implied skills found.",
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
    "  - impliedSkills: []",
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
    config: { httpOptions: { timeout: GEMINI_TIMEOUT_MS } },
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
    config: { httpOptions: { timeout: GEMINI_TIMEOUT_MS } },
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

// Each array is a group of equivalent skill names. Matching any one satisfies any other.
const SKILL_GROUPS: readonly string[][] = [
  [
    "git",
    "github",
    "gitlab",
    "bitbucket",
    "version control",
    "source control",
    "svn",
  ],
  ["javascript", "js", "es6", "es2015", "ecmascript", "vanilla js"],
  ["typescript", "ts"],
  ["node.js", "node", "nodejs", "node js"],
  ["postgresql", "postgres", "psql", "pg", "postgresdb"],
  ["mysql", "mariadb"],
  ["react", "reactjs", "react.js", "react js"],
  ["next.js", "nextjs", "next js"],
  ["vue.js", "vue", "vuejs", "vue js"],
  ["angular", "angularjs", "angular.js"],
  ["svelte", "sveltekit"],
  ["docker", "containerization", "containers", "dockerfile"],
  ["kubernetes", "k8s"],
  ["mongodb", "mongo"],
  ["graphql", "gql", "apollo graphql", "apollo"],
  ["python", "py"],
  ["c#", "csharp", "c sharp"],
  [".net", "dotnet", "asp.net", "aspnet"],
  ["java", "java se", "java ee"],
  ["spring boot", "spring", "springboot", "spring framework"],
  ["redis", "ioredis", "upstash redis"],
  ["aws", "amazon web services", "amazon aws"],
  ["gcp", "google cloud", "google cloud platform"],
  ["azure", "microsoft azure"],
  ["terraform", "tf", "infrastructure as code", "iac"],
  ["tailwind", "tailwindcss", "tailwind css"],
  ["express", "express.js", "expressjs"],
  ["rest api", "rest", "restful", "restful api"],
  ["websocket", "websockets", "socket.io", "ws", "web sockets"],
  ["jest", "vitest", "jasmine", "mocha"],
  ["linux", "unix", "ubuntu", "debian"],
  ["ci/cd", "github actions", "gitlab ci", "jenkins", "circleci", "devops"],
  ["html", "html5"],
  ["css", "css3", "scss", "sass"],
  ["flutter", "dart"],
  ["firebase", "firestore", "firebase functions"],
  ["bullmq", "bull", "job queue", "message queue"],
  ["drizzle", "drizzle orm"],
  ["prisma", "prisma orm"],
];

const skillGroupIndex = new Map<string, number>();
SKILL_GROUPS.forEach((group, idx) => {
  group.forEach((s) => skillGroupIndex.set(s.toLowerCase(), idx));
});

function skillMatches(jobSkill: string, candidateSet: Set<string>): boolean {
  const norm = jobSkill.toLowerCase().trim();
  if (candidateSet.has(norm)) return true;

  const groupIdx = skillGroupIndex.get(norm);
  if (groupIdx === undefined) return false;

  for (const member of SKILL_GROUPS[groupIdx]!) {
    if (candidateSet.has(member.toLowerCase())) return true;
  }
  return false;
}

async function generateAiSummary(
  parsedCv: ParsedCv,
  jobReqs: JobRequirements,
  score: Omit<ScoreResult, "aiSummary">,
): Promise<AiSummary | null> {
  const verdictFromScore = (s: number) => {
    if (s >= 75) return "strong_fit";
    if (s >= 50) return "moderate_fit";
    if (s >= 25) return "weak_fit";
    return "not_recommended";
  };

  const prompt = [
    "You are a senior technical recruiter writing a concise candidate assessment for a hiring manager.",
    "Analyze the candidate's fit based on the CV analysis data below.",
    "Return ONLY a valid JSON object — no explanation, no markdown, no code fences.",
    "",
    "JSON schema to return:",
    "{",
    '  "quickSummary": "1-2 sentence overall assessment of the candidate",',
    '  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],',
    '  "gaps": ["gap or consideration 1 with context", "gap 2"],',
    '  "hiringSignal": "1-2 sentence hiring recommendation",',
    `  "verdict": "${verdictFromScore(score.matchScore)}"`,
    "}",
    "",
    `verdict must be exactly one of: "strong_fit" (score >= 75), "moderate_fit" (score 50-74), "weak_fit" (score 25-49), "not_recommended" (score < 25)`,
    "",
    "== CV DATA ==",
    `Listed Skills: ${parsedCv.listedSkills.join(", ") || "none"}`,
    `Project Technologies: ${parsedCv.projectTechnologies.join(", ") || "none"}`,
    `Implied Skills (inferred from GitHub URLs, deployments, etc.): ${parsedCv.impliedSkills.join(", ") || "none"}`,
    `Total Experience: ${parsedCv.totalExperienceYears} years`,
    `Career Level: ${parsedCv.jobLevel ?? "unknown"}`,
    `Certifications: ${parsedCv.certifications.join(", ") || "none"}`,
    "",
    "== JOB REQUIREMENTS ==",
    `Required Skills: ${jobReqs.skills.join(", ") || "none specified"}`,
    `Min Experience: ${jobReqs.minExperienceYears} years`,
    `Required Level: ${jobReqs.jobLevel ?? "not specified"}`,
    `Required Certifications: ${jobReqs.requiredCertifications.join(", ") || "none"}`,
    "",
    "== MATCH RESULTS ==",
    `Overall Score: ${score.matchScore}/100`,
    `Matched Skills: ${score.matchedSkills.join(", ") || "none"}`,
    `Missing Skills (not found explicitly or implicitly): ${score.missingSkills.join(", ") || "none"}`,
    `Skills Score: ${score.scoreBreakdown.skills}/55`,
    `Experience Score: ${score.scoreBreakdown.experience}/25`,
    `Level Score: ${score.scoreBreakdown.level}/15`,
    `Certifications Score: ${score.scoreBreakdown.certs}/5`,
    "",
    "Guidelines:",
    "- Be nuanced about gaps. If a skill appears missing but implied skills or related tools cover it, note this clearly.",
    "- Strengths must be specific and evidence-based (reference actual skills/experience from the data).",
    "- Keep each bullet/strength/gap under 20 words.",
    "- quickSummary should be direct and informative (no fluff).",
    "- hiringSignal must give a concrete recommendation.",
    "- Include 2-4 strengths and 0-3 gaps (omit gaps array items if no real gaps exist).",
  ].join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ text: prompt }],
      config: { httpOptions: { timeout: GEMINI_TIMEOUT_MS } },
    });

    let raw = response.text?.trim() ?? "";
    if (raw.startsWith("```")) {
      const parts = raw.split("```");
      raw = parts[1] ?? "";
      if (raw.startsWith("json")) raw = raw.slice(4);
      raw = raw.trim();
    }

    return JSON.parse(raw) as AiSummary;
  } catch (err) {
    logger.warn(`[CV Analysis] AI summary generation failed: ${String(err)}`);
    return null;
  }
}

function scoreCV(
  parsedCv: ParsedCv,
  jobReqs: JobRequirements,
): Omit<ScoreResult, "aiSummary"> {
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
    ...(parsedCv.impliedSkills ?? []),
  ];

  const cvSkillsSet = new Set(
    allCandidateTech.map((s) => s.toLowerCase().trim()),
  );

  const matchedSkills = jobReqs.skills.filter((s) =>
    skillMatches(s, cvSkillsSet),
  );
  const missingSkills = jobReqs.skills.filter(
    (s) => !skillMatches(s, cvSkillsSet),
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
  // Marks the row pending (called by the producer before enqueueing)
  async markPending(candidateId: number, jobId: number): Promise<void> {
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
          scoreBreakdown: null,
          aiSummary: null,
          extractedText: null,
          errorMessage: null,
          updatedAt: new Date(),
        },
      });

    logger.info(
      `[CV Analysis] Marked pending for candidate ${candidateId}, job ${jobId}`,
    );
  },

  // Marks the row failed (called by the worker after retries are exhausted)
  async markFailed(candidateId: number, message: string): Promise<void> {
    await db
      .update(candidateCvAnalysis)
      .set({
        status: "failed",
        errorMessage: message ?? "Unknown error during CV analysis",
        updatedAt: new Date(),
      })
      .where(eq(candidateCvAnalysis.candidateId, candidateId));
  },

  // Runs inside the BullMQ worker.
  async runAnalysis(
    candidateId: number,
    jobId: number,
    resumeUrl: string,
  ): Promise<void> {
    logger.info(
      `[CV Analysis] Running for candidate ${candidateId}, job ${jobId}`,
    );

    const [jobRow] = await db
      .select({ description: jobs.description })
      .from(jobs)
      .where(eq(jobs.id, jobId));

    const jobSkillRows = await db
      .select({ skill: jobSkills.skill })
      .from(jobSkills)
      .where(eq(jobSkills.jobId, jobId));

    logger.info(`[CV Analysis] Job has ${jobSkillRows.length} required skills`);

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

    const scoreResult = scoreCV(parsedCv, jobReqs);
    const { matchScore, matchedSkills, missingSkills, scoreBreakdown } =
      scoreResult;

    logger.info(
      `[CV Analysis] Score: ${matchScore} — implied skills: ${(parsedCv.impliedSkills ?? []).join(", ") || "none"}`,
    );

    const aiSummary = await generateAiSummary(parsedCv, jobReqs, scoreResult);

    await db
      .update(candidateCvAnalysis)
      .set({
        status: "done",
        matchScore,
        matchedSkills,
        missingSkills,
        scoreBreakdown,
        aiSummary,
        updatedAt: new Date(),
      })
      .where(eq(candidateCvAnalysis.candidateId, candidateId));

    logger.info(
      `[CV Analysis] Done for candidate ${candidateId} — score: ${matchScore}`,
    );
  },
};
