export const COLORS = {
  DARK: "var(--assessment-dark)",
  LIGHT_BG: "var(--assessment-bg)",
  WHITE: "var(--assessment-white)",
  BORDER: "var(--assessment-border)",
  TEXT_MAIN: "var(--assessment-text-main)",
  TEXT_MUTED: "var(--assessment-text-muted)",
  TEXT_LIGHT: "var(--assessment-text-light)",
  EMERALD: "#22c55e",
  SELECTED_BG: "var(--assessment-selected-bg)",
};

export function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
