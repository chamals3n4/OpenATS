"use client";

import { useState } from "react";
import { COLORS, formatTime } from "../../_lib/assessment-constants";
import { ClockIcon, XIcon } from "../icons/assessment-icons";
import { QuitDialog } from "./quit-dialog";

interface QuizHeaderProps {
  title: string;
  candidateName: string;
  currentQ: number;
  total: number;
  answered: number;
  timeLeft: number;
  progress: number;
}

export function QuizHeader({
  title,
  candidateName,
  currentQ,
  total,
  answered,
  timeLeft,
  progress,
}: QuizHeaderProps) {
  const [quitOpen, setQuitOpen] = useState(false);

  return (
    <div
      style={{
        backgroundColor: COLORS.WHITE,
        borderBottom: `1px solid ${COLORS.BORDER}`,
        flexShrink: 0,
        padding: "16px 28px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: COLORS.TEXT_MAIN,
              margin: 0,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: COLORS.TEXT_MUTED,
              margin: "3px 0 0 0",
            }}
          >
            {candidateName}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button
            onClick={() => setQuitOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 16px",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              backgroundColor: "#fff1f2",
              color: "#dc2626",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <XIcon size={14} />
            Quit
          </button>

          <QuitDialog
            open={quitOpen}
            onOpenChange={setQuitOpen}
            onConfirm={() => {
              window.location.href = "/";
            }}
            title="Quit this quiz?"
            description="Your progress will be lost. This action cannot be undone."
            confirmText="Yes, Quit"
            cancelText="Stay in Quiz"
            confirmVariant="danger"
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ClockIcon />
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: timeLeft < 120 ? "#ef4444" : COLORS.TEXT_MAIN,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {formatTime(timeLeft)}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: COLORS.TEXT_LIGHT,
                  margin: "3px 0 0 0",
                }}
              >
                Time Remaining
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: COLORS.TEXT_MUTED,
          marginBottom: 10,
        }}
      >
        <span>
          Question {currentQ + 1} of {total}
        </span>
        <span>{answered} Answered</span>
      </div>

      <div
        style={{
          height: 8,
          backgroundColor: "var(--assessment-border)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: COLORS.DARK,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
