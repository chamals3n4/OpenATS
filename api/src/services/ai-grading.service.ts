interface GradeInput {
  question: string;
  rubric: string;
  answer: string;
  maxPoints: number;
}

interface GradeOutput {
  score: number;
  feedback?: string;
}

function parseGradeJson(raw: string): GradeOutput | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    const parts = text.split("```");
    text = (parts[1] ?? "").replace(/^json\s*/i, "").trim();
  }
  const parsed = JSON.parse(text) as GradeOutput;
  const score = Number(parsed.score);
  if (Number.isNaN(score)) return null;
  const feedback =
    typeof parsed.feedback === "string" && parsed.feedback.trim()
      ? parsed.feedback.trim()
      : undefined;
  return { score, feedback };
}

async function gradeWithGroq(input: GradeInput): Promise<GradeOutput> {
  if (!process.env.GROQ_API_KEY) {
    return { score: 0, feedback: undefined };
  }

  const prompt = [
    "You are grading a candidate's short-answer technical assessment response.",
    `Question: ${input.question}`,
    `Rubric: ${input.rubric}`,
    `Candidate answer: ${input.answer}`,
    `Maximum points: ${input.maxPoints}`,
    "Return ONLY valid JSON in this format:",
    '{"score": 0, "feedback": "2-4 sentence rationale referencing the rubric and answer quality"}',
    "Rules:",
    "- score must be a number between 0 and max points",
    "- feedback must briefly explain strengths/gaps vs the rubric",
    "- use decimals for score if needed",
    "- no text outside the JSON object",
  ].join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return { score: 0, feedback: undefined };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return { score: 0, feedback: undefined };
  }

  try {
    const parsed = parseGradeJson(text);
    if (!parsed) return { score: 0, feedback: undefined };
    const clamped = Math.max(0, Math.min(input.maxPoints, parsed.score));
    return { score: clamped, feedback: parsed.feedback };
  } catch {
    return { score: 0, feedback: undefined };
  }
}

export const aiGradingService = {
  async gradeShortAnswer(input: GradeInput): Promise<GradeOutput> {
    try {
      return await gradeWithGroq(input);
    } catch {
      return { score: 0, feedback: undefined };
    }
  },
};
