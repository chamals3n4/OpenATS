"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/public${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

type OfferPayload = {
  id: number;
  status: string;
  expiresAt: string;
  respondedAt: string | null;
  offer: {
    id: number;
    status: string;
    renderedHtml: string | null;
    expiryDate: string | null;
    jobId: number;
    jobTitle: string;
  };
  candidate: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export default function CandidateOfferPage() {
  const params = useParams();
  const token = String(params.id ?? "");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<OfferPayload | null>(null);
  const [decision, setDecision] = useState<"accepted" | "declined">("accepted");
  const [responderName, setResponderName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showLetter, setShowLetter] = useState(false);

  useEffect(() => {
    if (!token) return;
    publicFetch<{ data: OfferPayload }>(`/offer/${token}`)
      .then(({ data }) => {
        setOffer(data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const isExpired = useMemo(() => {
    if (!offer) return false;
    return new Date(offer.expiresAt) < new Date();
  }, [offer]);

  const submitResponse = async () => {
    if (!offer) return;
    if (decision === "accepted" && responderName.trim().length < 2) {
      setError("Please enter your name to accept the offer.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await publicFetch(`/offer/${token}/respond`, {
        method: "POST",
        headers: {
          "x-offer-response-intent": "candidate-submit-v1",
        },
        body: JSON.stringify({
          decision,
          responderName: responderName.trim(),
          message: message.trim() || undefined,
        }),
      });
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 p-8 text-center text-slate-700 dark:text-neutral-200">
        Loading offer...
      </main>
    );
  }

  if (error && !offer) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 p-8 text-center text-red-600 dark:text-red-400">
        {error}
      </main>
    );
  }

  if (!offer) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 p-8 text-center text-slate-700 dark:text-neutral-200">
        Offer not found.
      </main>
    );
  }

  if (submitted || offer.status !== "pending") {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
            Response received
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-neutral-300">
            Thank you, {offer.candidate.firstName}. Your response has been recorded.
          </p>
        </section>
      </main>
    );
  }

  if (isExpired) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
            Offer expired
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-neutral-300">
            This offer has expired. Please contact the hiring team if you need support.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
                Review Offer
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
                Candidate: {offer.candidate.firstName} {offer.candidate.lastName}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
                Job Title: {offer.offer.jobTitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex w-fit items-center rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                Expires on {new Date(offer.expiresAt).toLocaleDateString()}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-md border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-100"
                onClick={() => setShowLetter(true)}
              >
                Show Offer Letter
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
          <h2 className="text-lg font-medium text-slate-900 dark:text-neutral-100">
            Your Decision
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDecision("accepted")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                decision === "accepted"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200"
              }`}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => setDecision("declined")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                decision === "declined"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  : "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200"
              }`}
            >
              Decline
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-200">
              Your Name {decision === "accepted" ? "*" : "(optional)"}
            </label>
            <input
              value={responderName}
              onChange={(e) => setResponderName(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-200">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100"
              placeholder="Add an optional message to the hiring team"
            />
          </div>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={submitResponse}
            disabled={submitting}
            className="w-full rounded-md bg-slate-900 dark:bg-neutral-100 px-4 py-2.5 text-sm font-medium text-white dark:text-neutral-900 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Response"}
          </button>
        </section>
      </div>
      <Sheet open={showLetter} onOpenChange={setShowLetter}>
        <SheetContent
          side="right"
          className="w-[96vw] sm:max-w-[860px] p-0 border-l border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
        >
          <SheetHeader className="border-b border-slate-200 dark:border-neutral-800 px-6 py-4">
            <SheetTitle className="text-slate-900 dark:text-neutral-100">
              Offer Letter
            </SheetTitle>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              HTML generated from template (PDF not enabled yet)
            </p>
          </SheetHeader>
          <div className="h-[calc(100vh-84px)] overflow-y-auto bg-slate-50 dark:bg-neutral-950 p-5">
            <div className="offer-preview mx-auto w-full max-w-[800px] rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 md:p-10 shadow-sm">
              <div
                className="offer-html"
                dangerouslySetInnerHTML={{
                  __html:
                    offer.offer.renderedHtml ??
                    "<p>Your offer letter content is not available.</p>",
                }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <style jsx global>{`
        .offer-preview .offer-html,
        .offer-preview .offer-html * {
          color: inherit;
        }
        .offer-preview .offer-html {
          color: #0f172a;
          line-height: 1.7;
          font-size: 15px;
        }
        .dark .offer-preview .offer-html {
          color: #e5e7eb;
        }
        .offer-preview .offer-html h1,
        .offer-preview .offer-html h2,
        .offer-preview .offer-html h3 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-weight: 700;
          line-height: 1.35;
        }
        .offer-preview .offer-html p {
          margin: 0 0 1rem 0;
        }
        .offer-preview .offer-html ul,
        .offer-preview .offer-html ol {
          margin: 0 0 1rem 1.25rem;
        }
        .offer-preview .offer-html a {
          color: #2563eb;
          text-decoration: underline;
        }
      `}</style>
    </main>
  );
}
