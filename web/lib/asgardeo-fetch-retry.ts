const RETRY_PATCH_KEY = "__openatsAsgardeoFetchRetryPatched";

type GlobalWithRetryFlag = typeof globalThis & {
  [RETRY_PATCH_KEY]?: boolean;
};

function shouldRetryAsgardeoRequest(input: RequestInfo | URL): boolean {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  return raw.includes("api.asgardeo.io");
}

function isRetriableNetworkError(error: unknown): boolean {
  const message = String(error ?? "").toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("network error")
  );
}

const globalRef = globalThis as GlobalWithRetryFlag;

if (!globalRef[RETRY_PATCH_KEY]) {
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    if (!shouldRetryAsgardeoRequest(input)) {
      return originalFetch(input, init);
    }

    const maxAttempts = 3;
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      try {
        return await originalFetch(input, init);
      } catch (error) {
        lastError = error;
        attempt += 1;

        if (attempt >= maxAttempts || !isRetriableNetworkError(error)) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }

    throw lastError ?? new Error("Asgardeo fetch failed");
  };

  globalRef[RETRY_PATCH_KEY] = true;
}
