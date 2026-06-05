"use client";

import { useEffect, useState, use } from "react";
import {
  fetchPublicOffer,
  acceptPublicOffer,
  declinePublicOffer,
} from "@/hooks/queries/use-offers";
import type { PublicOfferView } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: {
    bg: "bg-slate-100 dark:bg-neutral-800",
    text: "text-slate-500 dark:text-neutral-400",
  },
  sent: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  viewed: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  accepted: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  declined: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
  },
  expired: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
  },
};

function fmtCurrency(value: number | string | null): string {
  if (value == null) return "—";
  return Number(value).toLocaleString("en-US");
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export default function OfferPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [offer, setOffer] = useState<PublicOfferView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicOffer(token)
      .then((data) => {
        setOffer(data);
        setLoading(false);
      })
      .catch((err) => {
        setError((err as Error).message || "Failed to load offer");
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await acceptPublicOffer(token);
      setOffer((prev) =>
        prev ? { ...prev, status: "accepted" } : prev,
      );
    } catch (err) {
      setActionError((err as Error).message || "Failed to accept offer");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this offer?")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await declinePublicOffer(token);
      setOffer((prev) =>
        prev ? { ...prev, status: "declined" } : prev,
      );
    } catch (err) {
      setActionError((err as Error).message || "Failed to decline offer");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="flex items-center gap-2.5 text-slate-400">
          <div className="size-4 border-2 border-slate-300 dark:border-neutral-600 border-t-slate-400 rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950 px-4">
        <div className="text-center max-w-md">
          <div className="size-14 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-[20px] font-bold text-slate-900 dark:text-neutral-100 mb-2">
            Offer Not Found
          </h1>
          <p className="text-[14px] text-slate-500 dark:text-neutral-400">
            {error || "This offer link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[offer.status] ?? STATUS_STYLES.draft;
  const canRespond = ["sent", "viewed"].includes(offer.status);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[24px] font-bold text-slate-900 dark:text-neutral-100 mb-2">
            Offer Letter
          </h1>
          <p className="text-[15px] text-slate-500 dark:text-neutral-400">
            {offer.jobTitle}
          </p>
          <div className="mt-3">
            <Badge
              className={`${statusStyle.bg} ${statusStyle.text} border-none px-3 py-1 text-[12px] font-bold uppercase tracking-wider shadow-none`}
            >
              {offer.status}
            </Badge>
          </div>
        </div>

        {/* Candidate info */}
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 mb-6">
          <p className="text-[13px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
            Candidate
          </p>
          <p className="text-[17px] font-bold text-slate-900 dark:text-neutral-100">
            {offer.candidateName}
          </p>
          <p className="text-[14px] text-slate-500 dark:text-neutral-400 mt-0.5">
            {offer.candidateEmail}
          </p>
        </div>

        {/* Offer Details */}
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <p className="text-[13px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Compensation &amp; Details
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {[
              {
                label: "Salary",
                value: offer.currency
                  ? `${offer.currency} ${fmtCurrency(offer.salary)}`
                  : fmtCurrency(offer.salary),
              },
              {
                label: "Employment Type",
                value: offer.employmentType
                  ? (EMPLOYMENT_LABELS[offer.employmentType] ??
                    offer.employmentType)
                  : "—",
              },
              { label: "Start Date", value: fmtDate(offer.startDate) },
              {
                label: "Reporting Manager",
                value: offer.reportingManager || "—",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between px-6 py-4 gap-4"
              >
                <span className="text-[13px] text-slate-500 dark:text-neutral-400 font-medium">
                  {label}
                </span>
                <span className="text-[13px] text-slate-800 dark:text-neutral-200 font-semibold text-right">
                  {value}
                </span>
              </div>
            ))}
          </div>
          {offer.benefits && (
            <>
              <Separator />
              <div className="px-6 py-4">
                <p className="text-[13px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  Benefits
                </p>
                <p className="text-[13px] text-slate-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                  {offer.benefits}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Offer Letter */}
        {offer.offerLetterHtml && (
          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
              <p className="text-[13px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Offer Letter
              </p>
            </div>
            <div className="px-6 py-4">
              <div
                className="prose prose-sm max-w-none text-slate-700 dark:text-neutral-300 [&_a]:text-[var(--theme-color)] [&_h1]:text-lg [&_h2]:text-base"
                dangerouslySetInnerHTML={{ __html: offer.offerLetterHtml }}
              />
            </div>
          </div>
        )}

        {/* Status Timeline */}
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 mb-6">
          <p className="text-[13px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
            Timeline
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Sent", value: fmtDate(offer.sentAt) },
              { label: "Viewed", value: fmtDate(offer.viewedAt) },
              { label: "Accepted", value: fmtDate(offer.acceptedAt) },
              { label: "Declined", value: fmtDate(offer.declinedAt) },
            ]
              .filter((i) => i.value !== "—")
              .map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider font-semibold">
                    {label}
                  </p>
                  <p className="text-[13px] text-slate-700 dark:text-neutral-300 font-medium mt-0.5">
                    {value}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        {canRespond && (
          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
            <p className="text-[15px] font-bold text-slate-900 dark:text-neutral-100 mb-4">
              Review &amp; Respond
            </p>

            {actionError && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400 font-medium mb-4">
                {actionError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleAccept}
                disabled={actionLoading}
                className="h-10 rounded-lg border-none bg-emerald-600 px-6 text-[14px] font-semibold text-white shadow-none hover:bg-emerald-500 disabled:opacity-60"
              >
                {actionLoading ? "Processing…" : "Accept Offer"}
              </Button>
              <Button
                onClick={handleDecline}
                disabled={actionLoading}
                className="h-10 rounded-lg border-none bg-neutral-700 px-6 text-[14px] font-semibold text-white shadow-none hover:bg-neutral-600 disabled:opacity-60"
              >
                {actionLoading ? "Processing…" : "Decline Offer"}
              </Button>
            </div>
          </div>
        )}

        {/* Already responded */}
        {offer.status === "accepted" && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 text-center">
            <p className="text-[16px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">
              🎉 Offer Accepted
            </p>
            <p className="text-[13px] text-emerald-600 dark:text-emerald-400">
              Congratulations! The hiring team has been notified.
            </p>
          </div>
        )}

        {offer.status === "declined" && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-6 text-center">
            <p className="text-[16px] font-bold text-red-600 dark:text-red-400 mb-1">
              Offer Declined
            </p>
            <p className="text-[13px] text-red-500 dark:text-red-500">
              You have declined this offer. The hiring team has been notified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
