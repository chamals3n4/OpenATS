import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "../auth/server";
import { serverFetch } from "../server-fetch";
import { getSession, requireRole } from "../auth/session";
import type { User } from "@/types";

// Server-side helpers shared by the /api/users routes.

/** Super admin user id, or throws */
export async function requireSuperAdmin(): Promise<number> {
  await requireRole("super_admin");
  const session = await getSession();
  return Number(session!.user.id);
}

export function parseUserId(raw: string): number | null {
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
}

/** Random password nobody knows */
export function unknowablePassword(): string {
  return randomBytes(24).toString("base64url");
}

export async function activeUsers(): Promise<User[]> {
  return (await serverFetch<{ data: User[] }>("/users")).data;
}

export async function getUser(id: number): Promise<User> {
  return (await serverFetch<{ data: User }>(`/users/${id}`)).data;
}

/** Send the set or reset password email */
export async function sendPasswordLink(email: string): Promise<void> {
  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/reset-password" },
    headers: await headers(),
  });
}

export function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Error to JSON response */
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
