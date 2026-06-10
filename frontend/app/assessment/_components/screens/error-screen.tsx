"use client";

import { COLORS } from "../../_lib/assessment-constants";

interface ErrorScreenProps {
  message: string;
}

export function ErrorScreen({ message }: ErrorScreenProps) {
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
      <p style={{ color: "#ef4444", fontSize: 15 }}>
        {message || "Something went wrong."}
      </p>
    </div>
  );
}
