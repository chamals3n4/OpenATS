import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "./auth";
import { serverFetch } from "./auth-action";
import { getSession, requireRole } from "./session";
import type { User } from "@/types";

// Server-side helpers shared by the /api/users routes.

/** The signed-in super admin's user id. Throws "Unauthorized" / "Forbidden". */
export async function requireSuperAdmin(): Promise<number> {
  await requireRole("super_admin");
  const session = await getSession();
  return Number(session!.user.id);
}

export function parseUserId(raw: string): number | null {
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
}

/** A password nobody knows: long, random, and never shown or sent. */
export function unknowablePassword(): string {
  return randomBytes(24).toString("base64url");
}

export async function activeUsers(): Promise<User[]> {
  return (await serverFetch<{ data: User[] }>("/users")).data;
}

export async function getUser(id: number): Promise<User> {
  return (await serverFetch<{ data: User }>(`/users/${id}`)).data;
}

/** Sends the set-password or reset-password email through Better Auth. */
export async function sendPasswordLink(email: string): Promise<void> {
  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/reset-password" },
    headers: await headers(),
  });
}

export function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Maps anything thrown in a users route to a JSON error response. */
export function errorResponse(log: string, error: unknown) {
  if (error instanceof APIError) {
    const status = typeof error.statusCode === "number" ? error.statusCode : 500;
    const message = error.body?.message ?? error.message ?? "Request failed";
    console.error(`${log} ${status}: ${message}`);
    return NextResponse.json({ error: message }, { status });
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`${log} error:`, message);

  const status =
    message === "Unauthorized" || message === "Not authenticated"
      ? 401
      : message === "Forbidden"
        ? 403
        : message === "User not found"
          ? 404
          : 500;
  return NextResponse.json({ error: message }, { status });
}
