"use client";

import { useEffect, useState, use } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import {
  fetchPublicOffer,
  acceptPublicOffer,
  declinePublicOffer,
} from "@/hooks/queries/use-offers";
import type { PublicOfferView } from "@/types";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className:
      "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400",
  },
  sent: {
    label: "Awaiting Response",
    className:
      "bg-(--theme-color)/10 text-[var(--theme-color)]",
  },
  viewed: {
    label: "Awaiting Response",
    className:
      "bg-(--theme-color)/10 text-[var(--theme-color)]",
  },
  accepted: {
    label: "Accepted",
    className:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  declined: {
    label: "Declined",
    className: "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400",
  },
  expired: {
    label: "Expired",
    className:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
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
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

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
      setOffer((prev) => (prev ? { ...prev, status: "accepted" } : prev));
    } catch (err) {
      setActionError((err as Error).message || "Failed to accept offer");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setShowDeclineConfirm(false);
    setActionLoading(true);
    setActionError(null);
    try {
      await declinePublicOffer(token);
      setOffer((prev) => (prev ? { ...prev, status: "declined" } : prev));
    } catch (err) {
      setActionError((err as Error).message || "Failed to decline offer");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="flex items-center gap-2.5 text-slate-400 dark:text-neutral-500">
          <Spinner className="size-4" />
          <p className="text-sm font-medium">Loading offer…</p>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 px-6">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <HugeiconsIcon
              icon={Alert02Icon}
              className="size-5 text-red-500 dark:text-red-400"
              strokeWidth={2}
            />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
            Offer not found
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
            {error || "This offer link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const status = STATUS_LABELS[offer.status] ?? STATUS_LABELS.draft;
  const canRespond = ["sent", "viewed"].includes(offer.status);

  const details = [
    {
      label: "Salary",
      value: offer.currency
        ? `${offer.currency} ${fmtCurrency(offer.salary)}`
        : fmtCurrency(offer.salary),
    },
    {
      label: "Employment type",
      value: offer.employmentType
        ? (EMPLOYMENT_LABELS[offer.employmentType] ?? offer.employmentType)
        : "—",
    },
    { label: "Start date", value: fmtDate(offer.startDate) },
    { label: "Reporting manager", value: offer.reportingManager || "—" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 transition-colors duration-300">
      <div className="max-w-[640px] mx-auto pt-14 pb-24 px-6 sm:px-8">
        <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">
          Offer Letter
        </p>

        <h1 className="mt-4 text-3xl sm:text-[32px] font-semibold text-slate-900 dark:text-neutral-100 leading-tight">
          {offer.jobTitle}
        </h1>

        <div className="mt-3 flex items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            {offer.candidateName}
          </p>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        {/* Details */}
        <div className="mt-10 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 p-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {details.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-neutral-100">
                  {value}
                </p>
              </div>
            ))}
            {offer.benefits && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                  Benefits
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-neutral-300 whitespace-pre-line">
                  {offer.benefits}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Respond */}
        {canRespond && (
          <div className="mt-12">
            {actionError && (
              <p className="mb-4 text-sm text-red-500 dark:text-red-400">
                {actionError}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleAccept}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300 text-white px-6 h-11 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading && <Spinner className="size-3.5" />}
                {actionLoading ? "Processing" : "Accept offer"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeclineConfirm(true)}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 dark:border-neutral-700 bg-transparent text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 px-6 h-11 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {offer.status === "accepted" && (
          <div className="mt-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 px-6 py-5 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <HugeiconsIcon
                icon={Tick02Icon}
                className="size-4 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2.5}
              />
            </div>
            <p className="text-base font-semibold text-emerald-700 dark:text-emerald-300">
              Offer accepted
            </p>
            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
              Congratulations! The hiring team has been notified.
            </p>
          </div>
        )}

        {offer.status === "declined" && (
          <div className="mt-12 rounded-xl bg-red-50 dark:bg-red-950/20 px-6 py-5 text-center">
            <p className="text-base font-semibold text-red-600 dark:text-red-400">
              Offer declined
            </p>
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">
              You have declined this offer. The hiring team has been notified.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 dark:text-neutral-500 mt-12">
          Powered by OpenATS
        </p>
      </div>

      {/* Decline confirmation */}
      <AlertDialog
        open={showDeclineConfirm}
        onOpenChange={(o) => !o && setShowDeclineConfirm(false)}
      >
        <AlertDialogContent className="max-w-sm rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
              Decline this offer?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-neutral-400 leading-relaxed">
              The hiring team will be notified. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-8 rounded-md border-none bg-neutral-700 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              className="h-8 rounded-md border-none bg-red-600 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
            >
              Decline offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
