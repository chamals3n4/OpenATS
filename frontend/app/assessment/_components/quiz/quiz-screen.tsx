"use client";

import { useState } from "react";
import { COLORS } from "../../_lib/assessment-constants";
import type {
  Question,
  Answer,
  AttemptData,
} from "../../_lib/assessment-types";
import { countAnswered } from "../../_lib/assessment-utils";
import { QuizHeader } from "./quiz-header";
import { QuestionCard } from "./quiz-card";
import { QuizNav } from "./quiz-nav";
import { QuizSidebar } from "./quiz-sidebar";

interface QuizScreenProps {
  attempt: AttemptData;
  currentQ: number;
  answers: Record<number, Answer>;
  timeLeft: number;
  submitting: boolean;
  submitError: string | null;
  onAnswerChange: (questionId: number, answer: Answer) => void;
  onNavigate: (direction: "prev" | "next") => void;
  onQuestionClick: (index: number) => void;
  onSubmit: () => void;
}

export function QuizScreen({
  attempt,
  currentQ,
  answers,
  timeLeft,
  submitting,
  submitError,
  onAnswerChange,
  onNavigate,
  onQuestionClick,
  onSubmit,
}: QuizScreenProps) {
  const questions = attempt.assessment.questions;
  const total = questions.length;
  const question = questions[currentQ];
  const answered = countAnswered(questions, answers);
  const progress = total > 0 ? (currentQ / total) * 100 : 0;

  if (!question) return null;

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: COLORS.LIGHT_BG,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <QuizHeader
        title={attempt.assessment.title}
        candidateName={`${attempt.candidate.firstName} ${attempt.candidate.lastName}`}
        currentQ={currentQ}
        total={total}
        answered={answered}
        timeLeft={timeLeft}
        progress={progress}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div
          style={{ flex: 1, overflowY: "auto", padding: "28px 24px 28px 28px" }}
        >
          <QuestionCard
            question={question}
            answer={answers[question.id]}
            onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
          />

          {submitError && (
            <div
              style={{
                backgroundColor: "#fff1f2",
                border: "1px solid #fca5a5",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 13,
                color: "#dc2626",
                lineHeight: 1.5,
                marginTop: 16,
              }}
            >
              {submitError}
            </div>
          )}

          <QuizNav
            currentQ={currentQ}
            total={total}
            submitting={submitting}
            onPrev={() => onNavigate("prev")}
            onNext={() => onNavigate("next")}
            nextLabel={currentQ === total - 1 ? "Submit Quiz" : "Next Question"}
          />
        </div>

        <QuizSidebar
          questions={questions}
          currentQ={currentQ}
          answers={answers}
          onQuestionClick={onQuestionClick}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
