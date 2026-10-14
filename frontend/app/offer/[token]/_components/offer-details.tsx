import type { PublicOfferView } from "@/types";
import { offerDetails, STATUS_LABELS } from "../_lib/offer-format";

// Title, candidate, status and the details box
export function OfferDetails({ offer }: { offer: PublicOfferView }) {
  const status = STATUS_LABELS[offer.status] ?? STATUS_LABELS.draft;

  return (
    <>
      <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">Offer Letter</p>

      <h1 className="mt-4 text-3xl sm:text-[32px] font-semibold text-slate-900 dark:text-neutral-100 leading-tight">
        {offer.jobTitle}
      </h1>

      <div className="mt-3 flex items-center gap-3">
        <p className="text-sm text-slate-500 dark:text-neutral-400">{offer.candidateName}</p>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-10 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 p-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          {offerDetails(offer).map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">{label}</p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-neutral-100">
                {value}
              </p>
            </div>
          ))}
          {offer.benefits && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">Benefits</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-neutral-300 whitespace-pre-line">
                {offer.benefits}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
