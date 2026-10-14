import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import type { PublicOfferView } from "@/types";

const api = vi.hoisted(() => ({
  fetchPublicOffer: vi.fn(),
  acceptPublicOffer: vi.fn(),
  declinePublicOffer: vi.fn(),
  markPublicOfferViewed: vi.fn(),
}));
vi.mock("@/hooks/queries/use-offers", () => api);

import OfferPortalPage from "@/app/offer/[token]/page";

const offer = (overrides: Partial<PublicOfferView> = {}) =>
  ({
    id: 1,
    status: "sent",
    salary: "250000",
    currency: "LKR",
    employmentType: "full_time",
    startDate: "2026-11-02T00:00:00.000Z",
    expiresAt: null,
    reportingManager: "Ayesha Perera",
    benefits: "Medical cover",
    jobTitle: "Software Engineer",
    candidateName: "Nimal Fernando",
    ...overrides,
  }) as PublicOfferView;

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <OfferPortalPage params={Promise.resolve({ token: "tok" })} />
      </Suspense>,
    );
  });
}

beforeEach(() => {
  api.acceptPublicOffer.mockResolvedValue(undefined);
  api.declinePublicOffer.mockResolvedValue(undefined);
  api.markPublicOfferViewed.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("public offer page", () => {
  it("shows the offer and marks a sent offer as viewed", async () => {
    api.fetchPublicOffer.mockResolvedValue(offer());
    await renderPage();

    expect(await screen.findByText("Software Engineer")).toBeTruthy();
    expect(screen.getByText("LKR 250,000")).toBeTruthy();
    expect(screen.getByText("Full-time")).toBeTruthy();
    expect(screen.getByText("Medical cover")).toBeTruthy();
    expect(api.fetchPublicOffer).toHaveBeenCalledWith("tok");
    expect(api.markPublicOfferViewed).toHaveBeenCalledWith("tok");
  });

  it("does not mark it viewed again", async () => {
    api.fetchPublicOffer.mockResolvedValue(offer({ status: "viewed" }));
    await renderPage();

    await screen.findByText("Software Engineer");
    expect(api.markPublicOfferViewed).not.toHaveBeenCalled();
  });

  it("accepts the offer", async () => {
    api.fetchPublicOffer.mockResolvedValue(offer());
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Accept offer" }));

    expect(await screen.findByText("Offer accepted")).toBeTruthy();
    expect(api.acceptPublicOffer).toHaveBeenCalledWith("tok");
    expect(screen.queryByRole("button", { name: "Accept offer" })).toBeNull();
  });

  it("asks before declining", async () => {
    api.fetchPublicOffer.mockResolvedValue(offer());
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
    expect(api.declinePublicOffer).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Decline offer" }));

    expect(await screen.findByText("Offer declined")).toBeTruthy();
    expect(api.declinePublicOffer).toHaveBeenCalledWith("tok");
  });

  it("shows the error and the real state when an answer is refused", async () => {
    api.fetchPublicOffer
      .mockResolvedValueOnce(offer())
      .mockResolvedValueOnce(offer({ status: "expired", expiresAt: "2026-10-01T10:00:00.000Z" }));
    api.acceptPublicOffer.mockRejectedValue(new Error("This offer has expired"));
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Accept offer" }));

    expect(await screen.findByText("This offer has expired")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/This offer is no longer open/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Accept offer" })).toBeNull();
  });

  it("shows the respond by date while it is open", async () => {
    api.fetchPublicOffer.mockResolvedValue(offer({ expiresAt: "2026-11-20T10:00:00.000Z" }));
    await renderPage();

    expect(await screen.findByText(/Please respond by/)).toBeTruthy();
  });

  it("says when the link does not work", async () => {
    api.fetchPublicOffer.mockRejectedValue(new Error("Offer not found"));
    await renderPage();

    expect(await screen.findByRole("heading", { name: "Offer not found" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Accept offer" })).toBeNull();
  });
});
