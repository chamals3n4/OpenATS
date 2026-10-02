import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AttentionPanel } from "@/app/(dashboard)/_components/overview/attention-panel";
import { ExportDialog } from "@/app/(dashboard)/_components/overview/export-dialog";
import { KpiCards } from "@/app/(dashboard)/_components/overview/kpi-cards";
import { buildKpis } from "@/app/(dashboard)/lib/overview-utils";
import type { AnalyticsReport, AttentionReport } from "@/types";

afterEach(cleanup);

const summary: AnalyticsReport["summary"] = {
  totalCandidates: 40,
  newCandidates: 12,
  totalCandidatesDeltaPct: 20,
  openPositions: 3,
  openPositionsDelta: 1,
  avgTimeToHireDays: null,
  avgTimeToHireDeltaDays: null,
  offersSent: 0,
  offerAcceptanceRate: null,
  offerAcceptanceRateDeltaPct: null,
};

describe("KpiCards", () => {
  it("shows each figure, a change only where there is one, and explains a missing figure", () => {
    render(<KpiCards kpis={buildKpis(summary)} comparedWith="the previous 7 days" isLoading={false} />);
    expect(screen.getByRole("heading", { name: "New applications" })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("+20%")).toHaveAttribute("title", "Compared with the previous 7 days");
    expect(screen.getByText("40 candidates in total")).toBeInTheDocument();
    // Time to hire and offer acceptance have no data: dashes with the reason, not zeros.
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("No offer was accepted in this period")).toBeInTheDocument();
    expect(screen.getByText("No offer was sent in this period")).toBeInTheDocument();
  });

  it("shows placeholders, not zeros, while loading", () => {
    render(<KpiCards kpis={[]} comparedWith="" isLoading />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

const NOW = new Date(2026, 5, 15, 12, 0).getTime();
const report: AttentionReport = {
  newApplicants: { last24h: 3 },
  upcomingInterviews: {
    count: 7,
    items: [{ interviewId: 1, candidateId: 11, candidateName: "Ada Lovelace", jobTitle: "Engineer", startsAt: new Date(2026, 5, 15, 15, 0).toISOString() }],
  },
  offersAwaitingAnswer: {
    count: 1,
    items: [{ offerId: 2, candidateId: 12, candidateName: "Grace Hopper", jobTitle: "Designer", sentAt: new Date(NOW - 3 * 86_400_000).toISOString() }],
  },
  stalledCandidates: {
    count: 1,
    afterDays: 7,
    items: [{ candidateId: 13, candidateName: "Alan Turing", jobTitle: "Intern", stageName: "Screening", days: 23 }],
  },
};

describe("AttentionPanel", () => {
  it("lists what needs attention with links into each candidate", () => {
    render(<AttentionPanel report={report} isLoading={false} isError={false} onRetry={() => {}} now={NOW} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    const ada = screen.getByRole("link", { name: /Ada Lovelace/ });
    expect(ada).toHaveAttribute("href", "/candidates/11");
    expect(ada).toHaveTextContent(/^Ada LovelaceEngineerToday, /);
    expect(screen.getByRole("link", { name: /Grace Hopper/ })).toHaveTextContent("Sent 3 days ago");
    expect(screen.getByRole("link", { name: /Alan Turing/ })).toHaveTextContent("Screening · Intern23 days");
    expect(screen.getByText("Waiting 7+ days in a stage")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open interviews" })).toHaveAttribute("href", "/interviews");
  });

  it("says plainly when nothing is waiting", () => {
    const empty: AttentionReport = {
      newApplicants: { last24h: 0 },
      upcomingInterviews: { count: 0, items: [] },
      offersAwaitingAnswer: { count: 0, items: [] },
      stalledCandidates: { count: 0, afterDays: 7, items: [] },
    };
    render(<AttentionPanel report={empty} isLoading={false} isError={false} onRetry={() => {}} now={NOW} />);
    expect(screen.getByText("No interviews scheduled this week")).toBeInTheDocument();
    expect(screen.getByText("No offers are waiting")).toBeInTheDocument();
    expect(screen.getByText("Nobody is stuck in a stage")).toBeInTheDocument();
  });

  it("shows an error with a retry only when there is nothing to show", () => {
    const onRetry = vi.fn();
    render(<AttentionPanel report={undefined} isLoading={false} isError onRetry={onRetry} now={NOW} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load what needs your attention.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("ExportDialog", () => {
  it("states what is exported, switches format and downloads", async () => {
    const onFormatChange = vi.fn();
    const onExport = vi.fn();
    render(
      <ExportDialog open format="csv" onFormatChange={onFormatChange} scope="Last 30 days, All departments" isPending={false} onClose={() => {}} onExport={onExport} />,
    );
    expect(screen.getByText(/Last 30 days, All departments\./)).toBeInTheDocument();
    const json = screen.getByRole("radio", { name: /JSON/ });
    fireEvent.pointerMove(json);
    fireEvent.mouseMove(json);
    fireEvent.click(json);
    await waitFor(() => expect(onFormatChange).toHaveBeenCalledWith("json"));
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(onExport).toHaveBeenCalled();
  });

  it("locks the buttons while exporting", () => {
    render(<ExportDialog open format="csv" onFormatChange={() => {}} scope="x" isPending onClose={() => {}} onExport={() => {}} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Exporting/ })).toBeDisabled();
  });
});
