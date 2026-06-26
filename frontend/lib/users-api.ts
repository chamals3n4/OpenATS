import type { User } from "@/types";

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password?: string;
  askPassword?: boolean;
  role?: "super_admin" | "hiring_manager" | "interviewer";
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "super_admin" | "hiring_manager" | "interviewer";
  oldRole?: "super_admin" | "hiring_manager" | "interviewer";
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to create user");
  }
  return res.json();
}

// invite and create use the same endpoint
export const inviteUser = createUser;

export async function updateUser(
  id: number,
  payload: UpdateUserPayload,
): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to update user");
  }
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to delete user");
  }
}
