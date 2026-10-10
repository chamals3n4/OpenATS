// Rules for user management, kept free of server imports so they can be
// unit-tested and shared by the routes and the settings page.

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./auth-errors";
import type { AppRole } from "./session";

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

/**
 * Stops an install from locking itself out. Returns the reason the change is
 * refused, or null when it may go ahead.
 *
 * `change` is "deactivate", or the role the target is being given.
 */
export function lockoutReason(opts: {
  actorId: number;
  target: { id: number; role: string };
  /** Ids of every active super admin, the target included if it is one. */
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
