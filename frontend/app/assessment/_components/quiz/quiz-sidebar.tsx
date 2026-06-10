"use client";

import { COLORS } from "../../_lib/assessment-constants";
import type { Question, Answer } from "../../_lib/assessment-types";
import { isAnswered } from "../../_lib/assessment-utils";

interface QuizSidebarProps {
  questions: Question[];
  currentQ: number;
  answers: Record<number, Answer>;
  onQuestionClick: (index: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export function QuizSidebar({
  questions,
  currentQ,
  answers,
  onQuestionClick,
  onSubmit,
  submitting,
}: QuizSidebarProps) {
  const answered = questions.filter((q) => isAnswered(q, answers)).length;
  const total = questions.length;

  const legendItems = [
    {
      bg: COLORS.DARK,
      border: `1px solid ${COLORS.DARK}`,
      color: COLORS.WHITE,
      label: "Current",
    },
    {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "1px solid rgba(22, 163, 74, 0.3)",
      color: "#16a34a",
      label: "Answered",
    },
    {
      bg: "var(--assessment-bg)",
      border: "1px solid transparent",
      color: COLORS.TEXT_MUTED,
      label: "Unanswered",
    },
  ];

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        backgroundColor: COLORS.WHITE,
        borderLeft: `1px solid ${COLORS.BORDER}`,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        padding: "24px 22px",
        gap: 20,
      }}
    >
      <div>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: COLORS.TEXT_MUTED,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 14px 0",
          }}
        >
          Questions
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 8,
          }}
        >
          {questions.map((q, i) => {
            const ans = isAnswered(q, answers);
            const isCurrent = i === currentQ;
            const bg = isCurrent
              ? COLORS.DARK
              : ans
                ? "rgba(34, 197, 94, 0.15)"
                : "var(--assessment-bg)";
            const color = isCurrent
              ? COLORS.WHITE
              : ans
                ? "#16a34a"
                : COLORS.TEXT_MUTED;
            const border = isCurrent
              ? `1px solid ${COLORS.DARK}`
              : ans
                ? "1px solid rgba(22, 163, 74, 0.3)"
                : "1px solid transparent";
            return (
              <button
                key={q.id}
                onClick={() => onQuestionClick(i)}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: 8,
                  border,
                  backgroundColor: bg,
                  color,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          borderTop: `1px solid ${COLORS.BORDER}`,
          paddingTop: 20,
        }}
      >
        {legendItems.map((item) => (
          <div
            key={item.label}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                backgroundColor: item.bg,
                border: item.border,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: COLORS.TEXT_MUTED }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto" }}>
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            width: "100%",
            padding: "12px 0",
            backgroundColor: submitting ? "#94a3b8" : COLORS.DARK,
            color: COLORS.WHITE,
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            transition: "opacity 0.15s",
          }}
        >
          {submitting ? "Submitting…" : "Submit Quiz"}
        </button>
        <p
          style={{
            fontSize: 11,
            color: COLORS.TEXT_LIGHT,
            textAlign: "center",
            margin: "8px 0 0 0",
          }}
        >
          {answered}/{total} answered
        </p>
      </div>
    </div>
  );
}
