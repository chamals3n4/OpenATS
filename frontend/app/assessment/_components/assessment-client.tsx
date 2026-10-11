"use client";

import { useState, useEffect, useCallback } from "react";
import { Alert02Icon, CheckmarkCircle02Icon, HourglassIcon } from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchAttempt,
  startAttempt,
  saveAnswer,
  completeAttempt,
} from "./assessment-api";
import { useAssessmentTimer } from "../hooks/use-assessment-timer";
import { buildAnswerPayload, countAnswered, restoreAnswers } from "../_lib/assessment-utils";
import type { Screen, AttemptData, Answer } from "../_lib/assessment-types";
import { IntroScreen } from "./screens/intro-screen";
import { MessageScreen } from "./screens/message-screen";
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
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchAttempt(token)
      .then(({ data }) => {
        setAttempt(data);
        // Carry on from what was already saved, for a reload or a second device.
        setAnswers(restoreAnswers(data.assessment.questions, data.savedAnswers));
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
      const started = await startAttempt(token);
      // The clock runs from the moment the server recorded, so it matches what a reload would show.
      const startedAt = started.data?.startedAt ?? new Date().toISOString();
      setAttempt((prev) => (prev ? { ...prev, status: "started", startedAt } : prev));
      setScreen("quiz");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to start");
      setScreen("error");
    } finally {
      setStarting(false);
    }
  };

  /** Saves one answer. Resolves to whether it worked, and shows a notice while the latest save has failed. */
  const saveCurrentAnswer = useCallback(
    async (qId: number, answer: Answer) => {
      try {
        await saveAnswer(token, buildAnswerPayload(qId, answer));
        setSaveFailed(false);
        return true;
      } catch {
        setSaveFailed(true);
        return false;
      }
    },
    [token],
  );

  const handleComplete = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const qs = attempt?.assessment.questions ?? [];
      const saved = await Promise.all(
        qs.filter((q) => answers[q.id]).map((q) => saveCurrentAnswer(q.id, answers[q.id])),
      );
      // Submitting now would lock in the assessment without those answers, so stop and let them retry.
      if (saved.includes(false)) {
        throw new Error("Some of your answers could not be saved. Check your connection, then submit again.");
      }
      await completeAttempt(token);
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

  const saveShownQuestion = useCallback(async () => {
    const q = attempt?.assessment.questions[currentQ];
    if (q && answers[q.id]) await saveCurrentAnswer(q.id, answers[q.id]);
  }, [attempt, currentQ, answers, saveCurrentAnswer]);

  const handleNavigate = useCallback(
    async (direction: "prev" | "next") => {
      if (!attempt) return;
      await saveShownQuestion();
      const last = attempt.assessment.questions.length - 1;
      setCurrentQ((i) => (direction === "next" ? Math.min(last, i + 1) : Math.max(0, i - 1)));
    },
    [attempt, saveShownQuestion],
  );

  const handleAnswerChange = useCallback(
    (questionId: number, answer: Answer) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    },
    [],
  );

  const handleQuestionClick = useCallback(
    async (index: number) => {
      await saveShownQuestion();
      setCurrentQ(index);
    },
    [saveShownQuestion],
  );

  switch (screen) {
    case "loading":
      return (
        <main className="flex min-h-dvh items-center justify-center bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-3 text-[15px] text-slate-600 dark:text-neutral-400">
            <Spinner className="size-5 text-theme" />
            Loading your assessment
          </div>
        </main>
      );
    case "error":
      return (
        <MessageScreen icon={Alert02Icon} tone="error" title="This assessment could not be opened">
          <p>{errorMsg || "Something went wrong."}</p>
          <p>Check that you used the full link from your email. If it still does not work, contact the hiring team.</p>
        </MessageScreen>
      );
    case "expired":
      return (
        <MessageScreen icon={HourglassIcon} tone="warning" title="This link has expired">
          <p>The time allowed to take this assessment has passed.</p>
          <p>If you still want to take it, contact the hiring team and ask for a new link.</p>
        </MessageScreen>
      );
    case "already_completed":
      return (
        <MessageScreen icon={CheckmarkCircle02Icon} tone="success" title="You have already submitted this">
          <p>Your answers were received, and an assessment can only be taken once.</p>
          <p>The hiring team will contact you about the next steps.</p>
        </MessageScreen>
      );
    case "intro":
      return attempt ? (
        <IntroScreen attempt={attempt} starting={starting} onStart={handleStart} />
      ) : null;
    case "submitted":
      return (
        <SubmittedScreen
          attempt={attempt}
          total={attempt?.assessment.questions.length ?? 0}
          answered={attempt ? countAnswered(attempt.assessment.questions, answers) : 0}
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
          saveFailed={saveFailed}
          onAnswerChange={handleAnswerChange}
          onAnswerCommit={(questionId, answer) => void saveCurrentAnswer(questionId, answer)}
          onNavigate={handleNavigate}
          onQuestionClick={handleQuestionClick}
          onSubmit={handleComplete}
        />
      ) : null;
    default:
      return null;
  }
}
