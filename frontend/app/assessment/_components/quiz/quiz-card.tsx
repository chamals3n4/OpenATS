"use client";

import { useState } from "react";
import { COLORS } from "../../_lib/assessment-constants";
import type { Question, Answer } from "../../_lib/assessment-types";
import { RadioCircle } from "../icons/assessment-icons";

interface QuestionCardProps {
  question: Question;
  answer: Answer | undefined;
  onAnswerChange: (answer: Answer) => void;
}

export function QuestionCard({
  question,
  answer,
  onAnswerChange,
}: QuestionCardProps) {
  const isMulti = question.questionType === "checkbox";
  const isOption =
    question.questionType === "radio" ||
    question.questionType === "multiple_choice" ||
    question.questionType === "checkbox";
  const isText =
    question.questionType === "short_answer" ||
    question.questionType === "long_answer";

  const toggleOption = (optId: number) => {
    const currentIds = answer?.optionIds ?? [];
    if (isMulti) {
      const next = currentIds.includes(optId)
        ? currentIds.filter((x) => x !== optId)
        : [...currentIds, optId];
      onAnswerChange({ optionIds: next });
    } else {
      onAnswerChange({ optionIds: [optId] });
    }
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        backgroundColor: COLORS.WHITE,
        borderRadius: 16,
        border: `1px solid ${COLORS.BORDER}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        padding: "36px 44px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div>
        <span
          style={{
            display: "inline-block",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            color: COLORS.DARK,
            fontSize: 13,
            fontWeight: 600,
            padding: "5px 14px",
            borderRadius: 99,
            marginBottom: 16,
          }}
        >
          Question {question.position}
        </span>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: COLORS.TEXT_MAIN,
            margin: "0 0 8px 0",
            lineHeight: 1.45,
          }}
        >
          {question.title}
        </h2>
        {question.description && (
          <p style={{ fontSize: 14, color: COLORS.TEXT_MUTED, margin: 0 }}>
            {question.description}
          </p>
        )}
      </div>

      {isText && (
        <div>
          <span
            style={{
              display: "inline-block",
              backgroundColor: "rgba(37, 99, 235, 0.1)",
              color: "#2563eb",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 99,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 10,
            }}
          >
            {question.questionType === "short_answer"
              ? "Short Answer"
              : "Long Answer"}
          </span>
          <textarea
            placeholder="Type your answer here..."
            value={answer?.answerText ?? ""}
            onChange={(e) => onAnswerChange({ answerText: e.target.value })}
            rows={question.questionType === "long_answer" ? 7 : 3}
            style={{
              width: "100%",
              padding: "14px 16px",
              border: `1px solid ${COLORS.BORDER}`,
              borderRadius: 12,
              fontSize: 15,
              color: COLORS.TEXT_MAIN,
              backgroundColor: COLORS.WHITE,
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.6,
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = COLORS.DARK)}
            onBlur={(e) => (e.target.style.borderColor = COLORS.BORDER)}
          />
          <p
            style={{
              fontSize: 12,
              color: COLORS.TEXT_LIGHT,
              margin: "8px 0 0 0",
            }}
          >
            {
              (answer?.answerText ?? "").trim().split(/\s+/).filter(Boolean)
                .length
            }{" "}
            words
          </p>
        </div>
      )}

      {isOption && question.options.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {isMulti && (
            <span
              style={{
                display: "inline-block",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                color: "#92400e",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 99,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
                width: "fit-content",
              }}
            >
              Multiple Select
            </span>
          )}
          {question.options.map((opt) => {
            const selectedIds = answer?.optionIds ?? [];
            const selected = selectedIds.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleOption(opt.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderRadius: 12,
                  textAlign: "left",
                  border: selected
                    ? `1.5px solid ${COLORS.DARK}`
                    : `1px solid ${COLORS.BORDER}`,
                  backgroundColor: selected ? COLORS.SELECTED_BG : COLORS.WHITE,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {isMulti ? (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      flexShrink: 0,
                      border: selected
                        ? `2px solid ${COLORS.DARK}`
                        : `2px solid var(--assessment-text-light)`,
                      backgroundColor: selected ? COLORS.DARK : COLORS.WHITE,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {selected && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <polyline
                          points="2 6 5 9 10 3"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                ) : (
                  <RadioCircle selected={selected} />
                )}
                <span
                  style={{
                    fontSize: 15,
                    color: selected ? COLORS.DARK : COLORS.TEXT_MAIN,
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
