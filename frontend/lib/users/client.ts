import type { User } from "@/types";

type Role = User["role"];

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  role?: Role;
  /** "invite" emails a set-password link; "set" uses `password`. */
  method: "invite" | "set";
  password?: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: Role;
}

async function request<T>(
  input: string,
  init: RequestInit | undefined,
  fallback: string,
): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? fallback);
  }
  return res.json() as Promise<T>;
}

function json(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export function fetchUsers(): Promise<User[]> {
  return request("/api/users", undefined, "Failed to fetch users");
}

export function createUser(
  payload: CreateUserPayload,
): Promise<{ success: true; reactivated?: boolean }> {
  return request("/api/users", json("POST", payload), "Failed to create user");
}

export function updateUser(
  id: number,
  payload: UpdateUserPayload,
): Promise<User> {
  return request(`/api/users/${id}`, json("PATCH", payload), "Failed to update user");
}

export async function deleteUser(id: number): Promise<void> {
  await request(`/api/users/${id}`, { method: "DELETE" }, "Failed to remove user");
}

export async function sendPasswordResetLink(id: number): Promise<void> {
  await request(
    `/api/users/${id}/password-reset`,
    { method: "POST" },
    "Failed to send the reset link",
  );
}

export async function setUserPassword(
  id: number,
  password: string,
): Promise<void> {
  await request(
    `/api/users/${id}/password`,
    json("POST", { password }),
    "Failed to set the password",
  );
}
