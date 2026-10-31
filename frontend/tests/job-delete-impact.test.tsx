import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const clientFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/client-fetch", () => ({ clientFetch }));

import { JobDeleteImpact } from "@/app/(dashboard)/jobs/_components/job-delete-impact";

function show(ids: number[], enabled = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <JobDeleteImpact ids={ids} enabled={enabled} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("JobDeleteImpact", () => {
  it("says how many candidates and offers go with the job", async () => {
    clientFetch.mockResolvedValue({ data: { candidates: 12, offers: 1 } });

    show([3, 4]);

    expect(await screen.findByText(/12 candidates, with their CVs and history, and 1 offer\./)).toBeTruthy();
    expect(clientFetch).toHaveBeenCalledWith("/jobs/delete-summary?ids=3,4");
  });

  it("says so when nothing else goes", async () => {
    clientFetch.mockResolvedValue({ data: { candidates: 0, offers: 0 } });

    show([3]);

    expect(await screen.findByText("No candidates or offers will be deleted with it.")).toBeTruthy();
  });

  it("still warns when the count fails", async () => {
    clientFetch.mockRejectedValue(new Error("nope"));

    show([3]);

    expect(await screen.findByText(/All of their candidates, CVs and offers/)).toBeTruthy();
  });

  it("does not ask until the dialog is open", () => {
    show([3], false);

    expect(clientFetch).not.toHaveBeenCalled();
  });
});
