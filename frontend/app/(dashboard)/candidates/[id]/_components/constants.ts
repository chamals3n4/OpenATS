"use client";

import {
  AiScanTextIcon,
  QuestionIcon,
  Clock01Icon,
  TelegramIcon,
  CoPresentIcon,
  UserRemove01Icon,
  Mail01Icon,
  Quiz03Icon,
} from "@hugeicons/core-free-icons";

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export const OFFER_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  draft: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  sent: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  viewed: {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    text: "text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  accepted: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
  declined: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
    dot: "bg-red-500",
  },
  expired: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
};

export const REJECTION_REASONS = [
  "Lack of required skills",
  "Insufficient experience",
  "Compensation mismatch",
  "Culture/team fit concerns",
  "Role requirements changed",
  "Candidate withdrew",
  "Other",
] as const;

export type SectionId =
  | "ai-analysis"
  | "answers"
  | "history"
  | "offer"
  | "interviews"
  | "rejection"
  | "email"
  | "scores";

export const SECTIONS = [
  // Listed only while AI CV analysis is turned on in Settings; see the candidate page.
  { id: "ai-analysis" as SectionId, label: "AI analysis", icon: AiScanTextIcon },
  { id: "answers" as SectionId, label: "Answers", icon: QuestionIcon },
  { id: "history" as SectionId, label: "Stage History", icon: Clock01Icon },
  { id: "offer" as SectionId, label: "Offer", icon: TelegramIcon },
  { id: "interviews" as SectionId, label: "Interviews", icon: CoPresentIcon },
  { id: "rejection" as SectionId, label: "Rejection", icon: UserRemove01Icon },
  { id: "email" as SectionId, label: "Send Email", icon: Mail01Icon },
  {
    id: "scores" as SectionId,
    label: "Scores",
    icon: Quiz03Icon,
  },
];
