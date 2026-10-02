"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon, File01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { OFFER_STATUS_STYLES, formatDate } from "../constants";
import {
  EMPLOYMENT_LABELS,
  canEditOffer,
  formatMoney,
} from "../../lib/offer-utils";
import { OfferLetterDialog } from "./offer-letter-dialog";
import { OfferTracker } from "./offer-tracker";
import type { Offer } from "@/types";

interface OfferDetailsProps {
  offer: Offer;
  candidateName: string;
  isHired: boolean;
  isSending: boolean;
  isMarkingHired: boolean;
  onEdit: () => void;
  onSend: () => void;
  onMarkHired: () => void;
}

const card =
  "rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900";

export function StatusPill({ status }: { status: string }) {
  const style = OFFER_STATUS_STYLES[status] ?? OFFER_STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style.bg} ${style.text}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-[15px] font-medium text-slate-900 dark:text-neutral-100">
        {children}
      </dd>
    </div>
  );
}

export function OfferDetails({
  offer,
  candidateName,
  isHired,
  isSending,
  isMarkingHired,
  onEdit,
  onSend,
  onMarkHired,
}: OfferDetailsProps) {
  const salary = formatMoney(offer.salary, offer.currency);
  const [letterOpen, setLetterOpen] = useState(false);

  return (
    <div className="space-y-4">
      <section className={card}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-5 py-4 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <h4 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
              Offer status
            </h4>
            <StatusPill status={offer.status} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {offer.offerLetterHtml && (
              <>
                <Button
                  variant="cancel"
                  onClick={() => setLetterOpen(true)}
                  className="h-9 gap-2 px-3.5 text-sm"
                >
                  <HugeiconsIcon icon={File01Icon} className="size-4" strokeWidth={1.75} />
                  View offer letter
                </Button>
                <OfferLetterDialog
                  open={letterOpen}
                  onOpenChange={setLetterOpen}
                  html={offer.offerLetterHtml}
                  candidateName={candidateName}
                />
              </>
            )}
            {canEditOffer(offer.status) && (
              <Button
                variant="cancel"
                onClick={onEdit}
                className="h-9 gap-2 px-3.5 text-sm"
              >
                <HugeiconsIcon icon={Edit02Icon} className="size-4" strokeWidth={1.75} />
                Edit
              </Button>
            )}
            {offer.status === "draft" && (
              <Button
                onClick={onSend}
                disabled={isSending}
                className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
              >
                {isSending ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <HugeiconsIcon
                    icon={SentIcon}
                    className="size-4 -rotate-45"
                    strokeWidth={2}
                  />
                )}
                {isSending ? "Sending" : "Send offer"}
              </Button>
            )}
            {offer.status === "accepted" &&
              (isHired ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  Hired
                </span>
              ) : (
                <Button
                  onClick={onMarkHired}
                  disabled={isMarkingHired}
                  className="h-9 gap-2 border-none bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {isMarkingHired && <Spinner className="size-3.5" />}
                  {isMarkingHired ? "Marking" : "Mark as hired"}
                </Button>
              ))}
          </div>
        </header>
        <div className="px-5 py-5">
          <OfferTracker offer={offer} />
        </div>
      </section>

      <section className={card}>
        <div className="border-b border-slate-300 px-5 py-5 dark:border-neutral-700">
          <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Salary
          </p>
          <p className="mt-1 text-3xl font-semibold leading-none text-slate-900 dark:text-neutral-100">
            {salary ?? <span className="text-slate-400">Not set</span>}
          </p>
        </div>
        <dl className="grid gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-3">
          <Detail label="Employment type">
            {offer.employmentType
              ? (EMPLOYMENT_LABELS[offer.employmentType] ?? offer.employmentType)
              : "—"}
          </Detail>
          <Detail label="Start date">{formatDate(offer.startDate)}</Detail>
          <Detail label="Reporting manager">{offer.reportingManager || "—"}</Detail>
        </dl>
        {offer.benefits && (
          <div className="border-t border-slate-300 px-5 py-5 dark:border-neutral-700">
            <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              Benefits
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
              {offer.benefits}
            </p>
          </div>
        )}
      </section>

    </div>
  );
}
