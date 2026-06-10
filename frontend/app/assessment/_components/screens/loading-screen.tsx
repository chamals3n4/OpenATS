"use client";

import { COLORS } from "../../_lib/assessment-constants";

export function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: COLORS.LIGHT_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p style={{ color: COLORS.TEXT_MUTED, fontSize: 15 }}>
        Loading assessment…
      </p>
    </div>
  );
}
