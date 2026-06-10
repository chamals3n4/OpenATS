"use client";

import { COLORS } from "../../_lib/assessment-constants";
import { BigCheckIcon } from "../icons/assessment-icons";
import type { AttemptData, ScoreResult } from "../../_lib/assessment-types";
import { countAnswered } from "../../_lib/assessment-utils";

interface SubmittedScreenProps {
  attempt: AttemptData | null;
  scoreResult: ScoreResult | null;
  submissionReason: string | null;
  total: number;
  answered: number;
}

export function SubmittedScreen({
  attempt,
  scoreResult,
  submissionReason,
  total,
  answered,
}: SubmittedScreenProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: COLORS.LIGHT_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: COLORS.WHITE,
          borderRadius: 16,
          border: "1.5px solid #bbf7d0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          padding: "56px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          textAlign: "center",
        }}
      >
        <BigCheckIcon />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: COLORS.TEXT_MAIN,
              margin: 0,
            }}
          >
            Quiz Submitted!
          </h1>
          <p
            style={{
              fontSize: 14,
              color: COLORS.TEXT_MUTED,
              margin: 0,
              lineHeight: 1.7,
            }}
          >
            Thank you for completing{" "}
            <strong>{attempt?.assessment.title}</strong>,{" "}
            {attempt?.candidate.firstName}.
          </p>
          {submissionReason && (
            <p
              style={{
                fontSize: 13,
                color: "#b45309",
                margin: 0,
                lineHeight: 1.7,
              }}
            >
              {submissionReason}
            </p>
          )}
        </div>
        <div
          style={{
            width: "100%",
            backgroundColor: "#f8fafc",
            borderRadius: 12,
            padding: "20px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.TEXT_MAIN,
              margin: 0,
            }}
          >
            Questions Answered:{" "}
            <span style={{ color: COLORS.DARK }}>
              {answered} of {total}
            </span>
          </p>
          {scoreResult?.passed && (
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.TEXT_MAIN,
                margin: 0,
              }}
            >
              Result: <span style={{ color: "#16a34a" }}>Passed ✓</span>
            </p>
          )}
          <p
            style={{
              fontSize: 13,
              color: COLORS.TEXT_MUTED,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Your responses have been recorded. We will review your answers and
            provide feedback soon.
          </p>
        </div>
        <p style={{ fontSize: 13, color: COLORS.TEXT_LIGHT, margin: 0 }}>
          A confirmation will be sent to {attempt?.candidate.email}
        </p>
      </div>
    </div>
  );
}
