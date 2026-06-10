const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}/public${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchAttempt(token: string) {
  return apiFetch<{ data: import("../_lib/assessment-types").AttemptData }>(
    `/assessment/${token}`,
  );
}

export function startAttempt(token: string) {
  return apiFetch(`/assessment/${token}/start`, { method: "POST" });
}

export function saveAnswer(token: string, payload: unknown) {
  return apiFetch(`/assessment/${token}/answer`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function completeAttempt(token: string, reason?: string) {
  return apiFetch<{
    message: string;
    data: import("../_lib/assessment-types").ScoreResult;
  }>(`/assessment/${token}/complete`, {
    method: "POST",
    body: JSON.stringify(reason ? { autoSubmitReason: reason } : {}),
  });
}
