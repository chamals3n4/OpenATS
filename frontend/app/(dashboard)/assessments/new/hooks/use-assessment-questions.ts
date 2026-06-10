"use client";

import { useState, useCallback } from "react";
import type { Question, QuestionType } from "../lib/assessment-builder-types";
import {
  makeQuestion,
  moveItem,
  getDefaultOptionsForType,
} from "../lib/assessment-builder-utils";

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
                {
                  id: Date.now(),
                  text: `Option ${q.options.length + 1}`,
                  isCorrect: false,
                },
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
        return {
          ...q,
          options: q.options.map((o) => ({
            ...o,
            isCorrect: o.id === optId ? !o.isCorrect : false,
          })),
        };
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
    updateQuestion,
    changeQuestionType,
    moveQuestion,
    addOption,
    removeOption,
    updateOptionText,
    toggleCorrectOption,
  };
}
