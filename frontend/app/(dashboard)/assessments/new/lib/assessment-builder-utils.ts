import type {
  Question,
  AnswerOption,
  QuestionType,
} from "./assessment-builder-types";
import { TRUE_FALSE_OPTIONS } from "./assessment-builder-constants";
import type { NewAssessmentQuestion } from "@/types";

let idCounter = 10;

export function makeOption(text: string): AnswerOption {
  return { id: ++idCounter, text, isCorrect: false };
}

export function makeQuestion(): Question {
  return {
    uid: ++idCounter,
    title: "",
    description: "",
    type: "Multiple Choice",
    points: 1,
    options: [
      makeOption("Option 1"),
      makeOption("Option 2"),
      makeOption("Option 3"),
    ],
  };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Written answers have no options; a person grades them. */
export const isWrittenType = (type: QuestionType) =>
  type === "Short Answer" || type === "Long Answer";

export const MIN_POINTS = 0.5;
export const MAX_POINTS = 1000;
export const clampPoints = (value: number) =>
  Number.isFinite(value) ? Math.min(MAX_POINTS, Math.max(MIN_POINTS, Math.round(value * 2) / 2)) : 1;

export function getDefaultOptionsForType(
  currentType: QuestionType,
  newType: QuestionType,
  currentOptions: AnswerOption[],
): AnswerOption[] {
  if (newType === "True/False") {
    return TRUE_FALSE_OPTIONS.map((o) => ({ ...o }));
  }
  if (currentType === "True/False") {
    return [
      makeOption("Option 1"),
      makeOption("Option 2"),
      makeOption("Option 3"),
    ];
  }
  // Only a multiple select can have more than one correct answer.
  if (newType === "Multiple Choice") {
    const first = currentOptions.findIndex((o) => o.isCorrect);
    return currentOptions.map((o, i) => ({ ...o, isCorrect: i === first && first !== -1 }));
  }
  return currentOptions;
}

/**
 * Marks an option correct (or not). A single-answer question keeps exactly one correct option;
 * a multiple select lets any number be correct, and is then graded with partial credit.
 */
export function toggleCorrectOption(question: Question, optionId: number): AnswerOption[] {
  const multi = question.type === "Multiple Select";
  return question.options.map((o) => ({
    ...o,
    isCorrect: o.id === optionId ? !o.isCorrect : multi ? o.isCorrect : false,
  }));
}

type ApiQuestionType = NewAssessmentQuestion["questionType"];

const API_TYPE: Record<QuestionType, ApiQuestionType> = {
  "Multiple Choice": "radio",
  "True/False": "radio",
  "Multiple Select": "checkbox",
  "Short Answer": "short_answer",
  "Long Answer": "long_answer",
};

export function questionToApi(q: Question, idx: number): NewAssessmentQuestion {
  const written = isWrittenType(q.type);
  return {
    title: q.title || `Question ${idx + 1}`,
    description: q.description || null,
    questionType: API_TYPE[q.type],
    points: clampPoints(q.points),
    position: idx + 1,
    options: written
      ? undefined
      : q.options.map((opt, oIdx) => ({
          label: opt.text || `Option ${oIdx + 1}`,
          isCorrect: opt.isCorrect,
          position: oIdx + 1,
        })),
  };
}

export function formatQuestionsForApi(questions: Question[]): NewAssessmentQuestion[] {
  return questions.map(questionToApi);
}

interface ApiQuestion {
  id: number;
  title?: string | null;
  description?: string | null;
  questionType: string;
  points?: number | string | null;
  options?: { id?: number; label: string; isCorrect: boolean }[];
}

/** The builder's version of a saved question. Older assessments stored every choice as "multiple_choice". */
export function questionFromApi(db: ApiQuestion): Question {
  const options = db.options ?? [];
  const correctCount = options.filter((o) => o.isCorrect).length;
  let type: QuestionType = "Multiple Choice";
  if (db.questionType === "short_answer") type = "Short Answer";
  else if (db.questionType === "long_answer") type = "Long Answer";
  else if (db.questionType === "checkbox" || correctCount > 1) type = "Multiple Select";
  else if (options.length === 2 && options[0]?.label === "True" && options[1]?.label === "False") {
    type = "True/False";
  }

  return {
    uid: ++idCounter,
    dbId: db.id,
    title: db.title ?? "",
    description: db.description ?? "",
    type,
    // Postgres `numeric` reaches us as a string.
    points: clampPoints(Number(db.points ?? 1)),
    options: options.map((o) => ({ id: o.id ?? ++idCounter, text: o.label, isCorrect: o.isCorrect })),
  };
}

/** The first thing wrong with the questions that would make them ungradable, or null. */
export function firstQuestionProblem(questions: Question[]): string | null {
  for (const [i, q] of questions.entries()) {
    if (isWrittenType(q.type)) continue;
    if (!q.options.some((o) => o.isCorrect)) {
      return `Question ${i + 1}: mark at least one correct answer, or it can never earn points.`;
    }
  }
  return null;
}
