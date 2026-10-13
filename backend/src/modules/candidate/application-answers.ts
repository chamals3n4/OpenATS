/**
 * Checks the answers sent with an application against the job's questions. The careers form
 * already does this in the browser, but anyone can send an application without the form, so the
 * server is the one that has to hold. Pure: no database, so every rule can be tested directly.
 */

export interface ApplicationQuestion {
  id: number;
  title: string;
  questionType: string;
  isRequired: boolean;
  options: Array<{ id: number; isKnockout: boolean }>;
}

export interface ApplicationAnswer {
  questionId: number;
  answerText?: string | null | undefined;
  optionIds?: number[] | undefined;
}

const CHOICE_TYPES = new Set(["checkbox", "radio", "multiple_choice"]);

/**
 * Whether an applicant has to answer the question. A question with a knockout option always has
 * to be answered, whether or not it was ticked as required: otherwise leaving it blank would be
 * the way to never be knocked out.
 */
export function mustAnswer(question: Pick<ApplicationQuestion, "isRequired" | "options">): boolean {
  return question.isRequired || question.options.some((option) => option.isKnockout);
}

/** The first thing wrong with the answers, worded for the applicant, or null when they are fine. */
export function findAnswerProblem(
  questions: ApplicationQuestion[],
  answers: ApplicationAnswer[],
): string | null {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const answered = new Set<number>();

  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    // Not skipped quietly: an answer to another job's question means the request was put
    // together by hand, and the rest of it should not be trusted either.
    if (!question) return "One of the answers is for a question that is not part of this job";
    if (answered.has(question.id)) return `"${question.title}" was answered more than once`;
    answered.add(question.id);

    const picked = answer.optionIds ?? [];
    const text = answer.answerText?.trim() ?? "";

    if (CHOICE_TYPES.has(question.questionType)) {
      if (text) return `Choose from the options for "${question.title}"`;
      if (new Set(picked).size !== picked.length) {
        return `An option was picked twice for "${question.title}"`;
      }
      const allowed = new Set(question.options.map((option) => option.id));
      if (picked.some((optionId) => !allowed.has(optionId))) {
        return `One of the options picked for "${question.title}" does not belong to it`;
      }
      if (question.questionType === "radio" && picked.length > 1) {
        return `Pick only one option for "${question.title}"`;
      }
    } else if (picked.length > 0) {
      return `"${question.title}" takes a written answer`;
    }
  }

  for (const question of questions) {
    if (!mustAnswer(question)) continue;

    const answer = answers.find((a) => a.questionId === question.id);
    const given = CHOICE_TYPES.has(question.questionType)
      ? (answer?.optionIds?.length ?? 0) > 0
      : Boolean(answer?.answerText?.trim());
    if (!given) return `Please answer "${question.title}"`;
  }

  return null;
}
