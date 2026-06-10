"use client";

import { COLORS } from "../../_lib/assessment-constants";

export function ExpiredScreen() {
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
          border: `1px solid ${COLORS.BORDER}`,
          padding: "48px 40px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 36, margin: "0 0 16px 0" }}>⏰</p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.TEXT_MAIN,
            margin: "0 0 10px 0",
          }}
        >
          Link Expired
        </h1>
        <p
          style={{
            fontSize: 14,
            color: COLORS.TEXT_MUTED,
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          This assessment link has expired. Please contact the hiring team for a
          new invitation.
        </p>
      </div>
    </div>
  );
}
