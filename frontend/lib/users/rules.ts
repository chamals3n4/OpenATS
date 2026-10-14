// User management rules, no server imports so they can be tested

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../auth/errors";
import type { AppRole } from "../auth/session";

export const APP_ROLES = ["super_admin", "hiring_manager", "interviewer"] as const;

export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" && (APP_ROLES as readonly string[]).includes(value)
  );
}

export function isValidPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PasswordMethod = "invite" | "set";

export type CreateUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  method: PasswordMethod;
  password?: string;
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseCreateUser(body: unknown): Parsed<CreateUserInput> {
  const input = (body ?? {}) as Record<string, unknown>;

  const email = text(input.email).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "A valid email is required." };
  }

  const firstName = text(input.firstName);
  if (!firstName) return { ok: false, error: "First name is required." };
  const lastName = text(input.lastName);

  const role = input.role ?? "interviewer";
  if (!isAppRole(role)) return { ok: false, error: "Unknown role." };

  if (input.method !== "invite" && input.method !== "set") {
    return { ok: false, error: "Choose how the password is set." };
  }

  if (input.method === "set") {
    if (!isValidPassword(input.password)) {
      return {
        ok: false,
        error: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
      };
    }
    return {
      ok: true,
      value: {
        email,
        firstName,
        lastName,
        role,
        method: "set",
        password: input.password,
      },
    };
  }

  return { ok: true, value: { email, firstName, lastName, role, method: "invite" } };
}

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: AppRole;
};

export function parseUpdateUser(body: unknown): Parsed<UpdateUserInput> {
  const input = (body ?? {}) as Record<string, unknown>;
  const value: UpdateUserInput = {};

  if (input.firstName !== undefined) {
    const firstName = text(input.firstName);
    if (!firstName) return { ok: false, error: "First name cannot be empty." };
    value.firstName = firstName;
  }

  if (input.lastName !== undefined) value.lastName = text(input.lastName);

  if (input.email !== undefined) {
    const email = text(input.email).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      return { ok: false, error: "A valid email is required." };
    }
    value.email = email;
  }

  if (input.role !== undefined) {
    if (!isAppRole(input.role)) return { ok: false, error: "Unknown role." };
    value.role = input.role;
  }

  return { ok: true, value };
}

/** As long as the name columns allow. */
export const NAME_MAX_LENGTH = 100;

export type OwnProfileInput = { firstName: string; lastName: string };

/** Users can only change their own name */
export function parseOwnProfile(body: unknown): Parsed<OwnProfileInput> {
  const input = (body ?? {}) as Record<string, unknown>;

  const firstName = text(input.firstName);
  if (!firstName) return { ok: false, error: "First name is required." };
  // Left out is fine, but anything sent must be text, not cleared by mistake
  if (input.lastName != null && typeof input.lastName !== "string") {
    return { ok: false, error: "Last name must be text." };
  }
  const lastName = text(input.lastName);

  if (firstName.length > NAME_MAX_LENGTH || lastName.length > NAME_MAX_LENGTH) {
    return { ok: false, error: `A name can be at most ${NAME_MAX_LENGTH} characters.` };
  }
  return { ok: true, value: { firstName, lastName } };
}

/** Stop removing the last super admin. Returns the reason or null */
export function lockoutReason(opts: {
  actorId: number;
  target: { id: number; role: string };
  /** Ids of all active super admins */
  activeSuperAdminIds: number[];
  change: "deactivate" | AppRole;
}): string | null {
  const { actorId, target, activeSuperAdminIds, change } = opts;

  const losesSuperAdmin =
    target.role === "super_admin" &&
    (change === "deactivate" || change !== "super_admin");
  if (!losesSuperAdmin && change !== "deactivate") return null;

  if (target.id === actorId) {
    return change === "deactivate"
      ? "You cannot deactivate your own account."
      : "You cannot change your own role.";
  }

  if (
    losesSuperAdmin &&
    activeSuperAdminIds.filter((id) => id !== target.id).length === 0
  ) {
    return "This is the last active super admin. Make someone else a super admin first.";
  }

  return null;
}
