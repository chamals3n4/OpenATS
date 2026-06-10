"use client";

import { COLORS } from "../../_lib/assessment-constants";
import { ArrowLeft, ArrowRight } from "../icons/assessment-icons";

interface QuizNavProps {
  currentQ: number;
  total: number;
  submitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  nextLabel: string;
}

export function QuizNav({
  currentQ,
  total,
  submitting,
  onPrev,
  onNext,
  nextLabel,
}: QuizNavProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        paddingTop: 4,
      }}
    >
      <button
        onClick={onPrev}
        disabled={currentQ === 0}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 22px",
          border: `1px solid ${COLORS.BORDER}`,
          borderRadius: 10,
          backgroundColor: COLORS.WHITE,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.TEXT_MUTED,
          cursor: currentQ === 0 ? "not-allowed" : "pointer",
          opacity: currentQ === 0 ? 0.4 : 1,
          transition: "opacity 0.15s",
        }}
      >
        <ArrowLeft />
        Previous
      </button>
      <button
        onClick={onNext}
        disabled={submitting}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 26px",
          border: "none",
          borderRadius: 10,
          backgroundColor: submitting ? "#94a3b8" : COLORS.DARK,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.WHITE,
          cursor: submitting ? "not-allowed" : "pointer",
          transition: "opacity 0.15s",
        }}
      >
        {submitting ? "Submitting…" : nextLabel}
        {!submitting && <ArrowRight />}
      </button>
    </div>
  );
}
