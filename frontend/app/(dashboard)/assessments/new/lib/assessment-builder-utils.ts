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
  return currentOptions;
}

export function formatQuestionsForApi(
  questions: Question[],
): NewAssessmentQuestion[] {
  return questions.map((q, idx) => {
    const isMultipleChoice = q.type !== "Short Answer";

    return {
      title: q.title || `Question ${idx + 1}`,
      description: q.description || null,
      questionType: isMultipleChoice ? "multiple_choice" : "short_answer",
      points: 1,
      position: idx + 1,
      options: isMultipleChoice
        ? q.options.map((opt, oIdx) => ({
            label: opt.text || `Option ${oIdx + 1}`,
            isCorrect: opt.isCorrect,
            position: oIdx + 1,
          }))
        : undefined,
    };
  });
}
