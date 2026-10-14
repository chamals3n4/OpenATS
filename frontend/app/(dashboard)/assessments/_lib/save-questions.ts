import type { Question } from "./assessment-builder-types";
import { questionToApi } from "./assessment-builder-utils";

type QuestionData = ReturnType<typeof questionToApi>;

/**
 * Saves the questions: deletes the removed ones, then updates or creates the rest in order.
 * savedIds is updated as it goes, and each new id is reported, so a retry after a failure
 * neither deletes twice nor creates copies.
 */
export async function saveQuestions({
  questions,
  savedIds,
  deleteQuestion,
  updateQuestion,
  createQuestion,
  onCreated,
}: {
  questions: Question[];
  // Ids of the questions saved in the database, kept up to date by this function
  savedIds: { current: number[] };
  deleteQuestion: (id: number) => Promise<unknown>;
  updateQuestion: (id: number, data: QuestionData) => Promise<unknown>;
  createQuestion: (data: QuestionData) => Promise<{ data: { id: number } }>;
  onCreated: (uid: number, dbId: number) => void;
}) {
  const kept = new Set(questions.filter((q) => q.dbId).map((q) => q.dbId!));
  for (const dbId of savedIds.current.filter((id) => !kept.has(id))) {
    await deleteQuestion(dbId);
    savedIds.current = savedIds.current.filter((id) => id !== dbId);
  }

  for (const [idx, q] of questions.entries()) {
    const data = questionToApi(q, idx);
    if (q.dbId) {
      await updateQuestion(q.dbId, data);
    } else {
      const created = await createQuestion(data);
      savedIds.current.push(created.data.id);
      onCreated(q.uid, created.data.id);
    }
  }
}
