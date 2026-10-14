"use client";

import { useState, useCallback } from "react";
import type { Question, QuestionType } from "../_lib/assessment-builder-types";
import {
  makeOption,
  makeQuestion,
  moveItem,
  getDefaultOptionsForType,
  toggleCorrectOption as toggleCorrect,
} from "../_lib/assessment-builder-utils";

export function useAssessmentQuestions() {
  const [questions, setQuestions] = useState<Question[]>(() => [
    makeQuestion(),
  ]);
  const [selectedQ, setSelectedQ] = useState<number>(
    () => questions[0]?.uid || 0,
  );

  const currentQ = questions.find((q) => q.uid === selectedQ) || questions[0];
  const currentIndex = questions.findIndex((q) => q.uid === selectedQ);

  const addQuestion = useCallback(() => {
    const q = makeQuestion();
    setQuestions((prev) => [...prev, q]);
    setSelectedQ(q.uid);
  }, []);

  const removeQuestion = useCallback(
    (qId: number) => {
      setQuestions((prev) => {
        if (prev.length === 1) return prev; // keep at least one
        const filtered = prev.filter((q) => q.uid !== qId);
        return filtered;
      });

      setSelectedQ((current) => {
        if (current !== qId) return current;
        const idx = questions.findIndex((q) => q.uid === qId);
        const nextQ = questions[idx - 1] || questions[idx + 1];
        return nextQ?.uid ?? questions[0]?.uid ?? 0;
      });
    },
    [questions],
  );

  // Question waiting for delete confirm
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);
  const pendingRemove = questions.find((q) => q.uid === pendingRemoveId) ?? null;
  const pendingRemoveNumber = questions.findIndex((q) => q.uid === pendingRemoveId) + 1;

  const requestRemoveQuestion = useCallback((qId: number) => setPendingRemoveId(qId), []);
  const cancelRemoveQuestion = useCallback(() => setPendingRemoveId(null), []);
  const confirmRemoveQuestion = () => {
    if (pendingRemoveId !== null) removeQuestion(pendingRemoveId);
    setPendingRemoveId(null);
  };

  const updateQuestion = useCallback(
    (qId: number, patch: Partial<Question>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.uid === qId ? { ...q, ...patch } : q)),
      );
    },
    [],
  );

  const changeQuestionType = useCallback(
    (qId: number, newType: QuestionType) => {
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.uid !== qId) return q;
          return {
            ...q,
            type: newType,
            options: getDefaultOptionsForType(q.type, newType, q.options),
          };
        }),
      );
    },
    [],
  );

  /** Load saved questions on the edit page */
  const replaceQuestions = useCallback((next: Question[]) => {
    setQuestions(next);
    setSelectedQ(next[0]?.uid ?? 0);
  }, []);

  const moveQuestion = useCallback((from: number, to: number) => {
    setQuestions((prev) => moveItem(prev, from, to));
  }, []);

  // Option CRUD
  const addOption = useCallback((qId: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.uid === qId
          ? {
              ...q,
              options: [
                ...q.options,
                makeOption(""),
              ],
            }
          : q,
      ),
    );
  }, []);

  const removeOption = useCallback((qId: number, optId: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.uid === qId
          ? { ...q, options: q.options.filter((o) => o.id !== optId) }
          : q,
      ),
    );
  }, []);

  const updateOptionText = useCallback(
    (qId: number, optId: number, text: string) => {
      setQuestions((prev) =>
        prev.map((q) =>
          q.uid === qId
            ? {
                ...q,
                options: q.options.map((o) =>
                  o.id === optId ? { ...o, text } : o,
                ),
              }
            : q,
        ),
      );
    },
    [],
  );

  const toggleCorrectOption = useCallback((qId: number, optId: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.uid !== qId) return q;
        return { ...q, options: toggleCorrect(q, optId) };
      }),
    );
  }, []);

  return {
    questions,
    selectedQ,
    currentQ,
    currentIndex,
    setSelectedQ,
    addQuestion,
    removeQuestion,
    requestRemoveQuestion,
    cancelRemoveQuestion,
    confirmRemoveQuestion,
    pendingRemove,
    pendingRemoveNumber,
    updateQuestion,
    changeQuestionType,
    moveQuestion,
    replaceQuestions,
    addOption,
    removeOption,
    updateOptionText,
    toggleCorrectOption,
  };
}
