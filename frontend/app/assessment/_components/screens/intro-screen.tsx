"use client";

import { useState } from "react";
import { COLORS } from "../../_lib/assessment-constants";
import { CheckIcon, PlayIcon } from "../icons/assessment-icons";
import { QuitDialog } from "../quiz/quit-dialog";
import type { AttemptData } from "../../_lib/assessment-types";

interface IntroScreenProps {
  attempt: AttemptData;
  starting: boolean;
  onStart: () => void;
}

export function IntroScreen({ attempt, starting, onStart }: IntroScreenProps) {
  const [policyOpen, setPolicyOpen] = useState(false);
  const timeMins = Math.floor((attempt.assessment.timeLimit ?? 0) / 60);

  const guidelines = [
    `You will have ${timeMins} minutes to complete this assessment. The timer will automatically submit when time expires.`,
    "Answer all questions to the best of your ability. You can navigate between questions using the Previous/Next buttons.",
    "Read each question carefully and provide complete answers for text questions.",
    "Once submitted, your answers cannot be changed. Review your responses before clicking Submit.",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: COLORS.LIGHT_BG,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          backgroundColor: COLORS.WHITE,
          borderRadius: 16,
          border: `1px solid ${COLORS.BORDER}`,
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ backgroundColor: COLORS.DARK, padding: "40px 40px" }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.WHITE,
              margin: 0,
              marginBottom: 8,
              lineHeight: 1.3,
            }}
          >
            {attempt.assessment.title}
          </h1>
          {attempt.assessment.description && (
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.75)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {attempt.assessment.description}
            </p>
          )}
        </div>

        <div
          style={{
            padding: "32px 40px",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 14,
                color: COLORS.TEXT_MUTED,
                margin: "0 0 6px 0",
              }}
            >
              Hello,{" "}
              <strong style={{ color: COLORS.TEXT_MAIN }}>
                {attempt.candidate.firstName} {attempt.candidate.lastName}
              </strong>
            </p>
            <p style={{ fontSize: 14, color: COLORS.TEXT_MUTED, margin: 0 }}>
              {attempt.assessment.questions.length} questions · {timeMins}{" "}
              minutes
            </p>
          </div>

          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: COLORS.TEXT_MAIN,
                margin: "0 0 20px 0",
              }}
            >
              Important Guidelines
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {guidelines.map((text, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
                >
                  <CheckIcon />
                  <span
                    style={{
                      fontSize: 14,
                      color: COLORS.TEXT_MUTED,
                      lineHeight: 1.6,
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setPolicyOpen(true)}
            disabled={starting}
            style={{
              width: "100%",
              height: 52,
              backgroundColor: starting ? "#94a3b8" : COLORS.DARK,
              color: COLORS.WHITE,
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: starting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "opacity 0.15s",
            }}
          >
            {starting ? "Starting…" : "Start Assessment"}
            {!starting && <PlayIcon />}
          </button>

          <QuitDialog
            open={policyOpen}
            onOpenChange={setPolicyOpen}
            onConfirm={onStart}
            title="Strict Assessment Policy"
            description={
              <>
                <span style={{ display: "block", marginBottom: 6 }}>
                  1. Do not exit the full screen mode.
                </span>
                <span style={{ display: "block" }}>
                  2. If you switch tabs, minimize, or move away from this
                  assessment window, the assessment will be stopped and
                  automatically submitted immediately.
                </span>
              </>
            }
            confirmText="I Agree, Start"
            cancelText="Cancel"
          />
        </div>
      </div>
    </div>
  );
}
