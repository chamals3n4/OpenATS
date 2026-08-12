"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchAttempt,
  startAttempt,
  saveAnswer,
  completeAttempt,
} from "./assessment-api";
import { useAssessmentTimer } from "../hooks/use-assessment-timer";
import { buildAnswerPayload } from "../_lib/assessment-utils";
import type {
  Screen,
  AttemptData,
  Answer,
  ScoreResult,
} from "../_lib/assessment-types";
import { LoadingScreen } from "./screens/loading-screen";
import { ErrorScreen } from "./screens/error-screen";
import { ExpiredScreen } from "./screens/expired-screen";
import { AlreadyCompletedScreen } from "./screens/already-completed-screen";
import { IntroScreen } from "./screens/intro-screen";
import { SubmittedScreen } from "./screens/submitted-screen";
import { QuizScreen } from "./quiz/quiz-screen";

interface AssessmentClientProps {
  token: string;
}

export function AssessmentClient({ token }: AssessmentClientProps) {
  const [screen, setScreen] = useState<Screen>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchAttempt(token)
      .then(({ data }) => {
        setAttempt(data);
        if (data.status === "completed") {
          setScreen("already_completed");
        } else if (data.status === "started") {
          setScreen("quiz");
        } else {
          setScreen("intro");
        }
      })
      .catch((e: Error) => {
        if (e.message.toLowerCase().includes("expired")) {
          setScreen("expired");
        } else {
          setErrorMsg(e.message);
          setScreen("error");
        }
      });
  }, [token]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await startAttempt(token);
      setScreen("quiz");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to start");
      setScreen("error");
    } finally {
      setStarting(false);
    }
  };

  const saveCurrentAnswer = useCallback(
    async (qId: number, answer: Answer) => {
      const payload = buildAnswerPayload(qId, answer);
      await saveAnswer(token, payload);
    },
    [token],
  );

  const handleComplete = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const qs = attempt?.assessment.questions ?? [];
      await Promise.all(
        qs
          .filter((q) => answers[q.id])
          .map((q) => saveCurrentAnswer(q.id, answers[q.id]).catch(() => {})),
      );
      const res = await completeAttempt(token);
      setScoreResult(res.data);
      setScreen("submitted");
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "Submission failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [submitting, attempt, answers, saveCurrentAnswer, token]);

  // Must come after `handleComplete` so the callback can close over it.
  const { timeLeft } = useAssessmentTimer(screen, attempt, () => {
    void handleComplete();
  });

  const handleNavigate = useCallback(
    async (direction: "prev" | "next") => {
      if (!attempt) return;
      const q = attempt.assessment.questions[currentQ];
      if (q && answers[q.id]) {
        await saveCurrentAnswer(q.id, answers[q.id]).catch(() => {});
      }
      if (direction === "next") {
        if (currentQ < attempt.assessment.questions.length - 1) {
          setCurrentQ((i) => i + 1);
        } else {
          await handleComplete();
        }
      } else {
        if (currentQ > 0) setCurrentQ((i) => i - 1);
      }
    },
    [attempt, currentQ, answers, saveCurrentAnswer, handleComplete],
  );

  const handleAnswerChange = useCallback(
    (questionId: number, answer: Answer) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    },
    [],
  );

  const handleQuestionClick = useCallback(
    async (index: number) => {
      if (!attempt) return;
      const q = attempt.assessment.questions[currentQ];
      if (q && answers[q.id]) {
        await saveCurrentAnswer(q.id, answers[q.id]).catch(() => {});
      }
      setCurrentQ(index);
    },
    [attempt, currentQ, answers, saveCurrentAnswer],
  );

  switch (screen) {
    case "loading":
      return <LoadingScreen />;
    case "error":
      return <ErrorScreen message={errorMsg} />;
    case "expired":
      return <ExpiredScreen />;
    case "already_completed":
      return <AlreadyCompletedScreen />;
    case "intro":
      return attempt ? (
        <IntroScreen attempt={attempt} starting={starting} onStart={handleStart} />
      ) : null;
    case "submitted":
      return (
        <SubmittedScreen
          attempt={attempt}
          scoreResult={scoreResult}
          total={attempt?.assessment.questions.length ?? 0}
          answered={Object.keys(answers).length}
        />
      );
    case "quiz":
      return attempt ? (
        <QuizScreen
          attempt={attempt}
          currentQ={currentQ}
          answers={answers}
          timeLeft={timeLeft}
          submitting={submitting}
          submitError={submitError}
          onAnswerChange={handleAnswerChange}
          onNavigate={handleNavigate}
          onQuestionClick={handleQuestionClick}
          onSubmit={handleComplete}
        />
      ) : null;
    default:
      return null;
  }
}
