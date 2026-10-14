import type { User } from "@/types";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/errors";

export const ROLES = [
  { value: "interviewer", label: "Interviewer" },
  { value: "hiring_manager", label: "Hiring Manager" },
  { value: "super_admin", label: "Super Admin" },
] as const;

export type Role = (typeof ROLES)[number]["value"];

export const PASSWORD_LENGTH_RULE = `Must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`;

export const inputCls =
  "h-9 bg-gray-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 rounded-md shadow-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0 transition-colors";

export const labelCls = "text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block";

export function getDisplayName(u: User) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

// Use crypto, not Math.random
export function generatePassword(length = 16) {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+";
  // Avoid modulo bias
  const limit = 256 - (256 % alphabet.length);
  const chars: string[] = [];
  while (chars.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && chars.length < length) {
        chars.push(alphabet[byte % alphabet.length]);
      }
    }
  }
  return chars.join("");
}
