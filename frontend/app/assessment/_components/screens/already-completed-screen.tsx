"use client";

import { COLORS } from "../../_lib/assessment-constants";
import { BigCheckIcon } from "../icons/assessment-icons";

export function AlreadyCompletedScreen() {
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
          maxWidth: 480,
          width: "100%",
          backgroundColor: COLORS.WHITE,
          borderRadius: 16,
          border: "1.5px solid #bbf7d0",
          padding: "48px 40px",
          textAlign: "center",
        }}
      >
        <BigCheckIcon />
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.TEXT_MAIN,
            margin: "20px 0 10px 0",
          }}
        >
          Already Submitted
        </h1>
        <p
          style={{
            fontSize: 14,
            color: COLORS.TEXT_MUTED,
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          You have already completed this assessment. Your responses have been
          recorded.
        </p>
      </div>
    </div>
  );
}
