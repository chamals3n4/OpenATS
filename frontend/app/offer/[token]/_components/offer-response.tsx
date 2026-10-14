import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";
import type { PublicOfferView } from "@/types";
import { canRespond, fmtDateTime } from "../_lib/offer-format";

// Accept and decline buttons, or the result once answered or expired
export function OfferResponse({
  offer,
  actionLoading,
  actionError,
  onAccept,
  onDecline,
}: {
  offer: PublicOfferView;
  actionLoading: boolean;
  actionError: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const open = canRespond(offer);

  return (
    <>
      {offer.status === "expired" && (
        <p className="mt-8 text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
          This offer is no longer open
          {offer.expiresAt ? `: it had to be answered by ${fmtDateTime(offer.expiresAt)}` : ""}.
          Please contact the hiring team if you would still like to discuss it.
        </p>
      )}

      {!open && actionError && (
        <p className="mt-4 text-sm text-red-500 dark:text-red-400">{actionError}</p>
      )}

      {open && (
        <div className="mt-12">
          {offer.expiresAt && (
            <p className="mb-4 text-sm text-slate-600 dark:text-neutral-400">
              Please respond by{" "}
              <span className="font-medium text-slate-900 dark:text-neutral-100">
                {fmtDateTime(offer.expiresAt)}
              </span>
              .
            </p>
          )}
          {actionError && (
            <p className="mb-4 text-sm text-red-500 dark:text-red-400">{actionError}</p>
          )}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={onAccept}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-theme hover:bg-theme-hover text-white px-6 h-11 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading && <Spinner className="size-3.5" />}
              {actionLoading ? "Processing" : "Accept offer"}
            </button>
            <button
              type="button"
              onClick={onDecline}
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
          <p className="text-base font-semibold text-red-600 dark:text-red-400">Offer declined</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">
            You have declined this offer. The hiring team has been notified.
          </p>
        </div>
      )}
    </>
  );
}
