import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Offer response — OpenATS",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getString(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

type Outcome =
  | "accepted"
  | "declined"
  | "already_responded"
  | "expired"
  | "invalid_link"
  | "error";

async function processOfferResponse(
  token: string,
  action: string,
): Promise<{ outcome: Outcome; previousStatus?: string; expiryDate?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

  try {
    const res = await fetch(
      `${apiUrl}/public/offers/respond?token=${encodeURIComponent(token)}&action=${encodeURIComponent(action)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );

    const data = await res.json().catch(() => ({ outcome: "error" }));
    return data as { outcome: Outcome; previousStatus?: string; expiryDate?: string };
  } catch {
    return { outcome: "error" };
  }
}

function IconCircle({
  variant,
  children,
}: {
  variant: "success" | "neutral" | "warning" | "muted";
  children: ReactNode;
}) {
  const ring =
    variant === "success"
      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
      : variant === "warning"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-400"
        : variant === "muted"
          ? "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400"
          : "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400";
  return (
    <div
      className={`size-16 rounded-full flex items-center justify-center mx-auto mb-6 ${ring}`}
    >
      {children}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-8"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function RecordNeutralIcon() {
  return (
    <svg
      className="size-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h8"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="size-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      className="size-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

export default async function OfferRespondPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = getString(params.token);
  const action = getString(params.action);

  let outcome: Outcome = "invalid_link";
  let previousStatus: string | undefined;
  let expiryDate: string | undefined;

  if (token && (action === "accept" || action === "decline")) {
    const result = await processOfferResponse(token, action);
    outcome = result.outcome;
    previousStatus = result.previousStatus;
    expiryDate = result.expiryDate;
  }

  const cardBorder =
    outcome === "accepted" || outcome === "already_responded"
      ? "border-emerald-200 dark:border-emerald-900/50"
      : outcome === "expired"
        ? "border-amber-200 dark:border-amber-900/50"
        : "border-slate-300 dark:border-neutral-800";

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-neutral-900 flex flex-col items-center justify-center pt-16 pb-24 px-4 transition-colors duration-300">
      <div
        className={`bg-white dark:bg-neutral-950 p-10 sm:p-12 rounded-2xl shadow-sm border text-center max-w-md w-full ${cardBorder}`}
      >
        {outcome === "accepted" && (
          <>
            <IconCircle variant="success">
              <CheckIcon />
            </IconCircle>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100 mb-3 tracking-tight">
              Response recorded
            </h1>
            <p className="text-[15px] text-slate-600 dark:text-neutral-400 leading-relaxed mb-1">
              Your acceptance of this offer has been saved. The hiring
              organization has been notified and will follow up with you
              regarding next steps.
            </p>
            <p className="text-[13px] text-slate-500 dark:text-neutral-500 leading-relaxed pt-2">
              Please retain this confirmation for your records. If you did not
              intend to accept, contact the sender immediately.
            </p>
          </>
        )}

        {outcome === "declined" && (
          <>
            <IconCircle variant="neutral">
              <RecordNeutralIcon />
            </IconCircle>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100 mb-3 tracking-tight">
              Response recorded
            </h1>
            <p className="text-[15px] text-slate-600 dark:text-neutral-400 leading-relaxed mb-1">
              Your decision to decline this offer has been saved. The hiring
              organization has been notified.
            </p>
            <p className="text-[13px] text-slate-500 dark:text-neutral-500 leading-relaxed pt-2">
              We appreciate your time in the process. For questions about this
              outcome, reply to the offer email you received.
            </p>
          </>
        )}

        {outcome === "already_responded" && (
          <>
            <IconCircle variant="success">
              <CheckIcon />
            </IconCircle>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100 mb-3 tracking-tight">
              No further action required
            </h1>
            <p className="text-[15px] text-slate-600 dark:text-neutral-400 leading-relaxed">
              {previousStatus ? (
                <>
                  This offer has already been updated and is currently recorded
                  as{" "}
                  <span className="font-medium text-slate-800 dark:text-neutral-200">
                    {previousStatus}
                  </span>
                  . No additional response is needed from this link.
                </>
              ) : (
                <>
                  This offer has already been actioned. No additional response
                  is needed from this link.
                </>
              )}
            </p>
            <p className="text-[13px] text-slate-500 dark:text-neutral-500 leading-relaxed pt-3">
              If you believe this is incorrect, contact the hiring team using
              the same channel as your earlier correspondence.
            </p>
          </>
        )}

        {outcome === "expired" && (
          <>
            <IconCircle variant="warning">
              <ClockIcon />
            </IconCircle>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100 mb-3 tracking-tight">
              Offer no longer open
            </h1>
            <p className="text-[15px] text-slate-600 dark:text-neutral-400 leading-relaxed">
              {expiryDate ? (
                <>
                  The acceptance period for this offer ended on{" "}
                  <span className="font-medium text-slate-800 dark:text-neutral-200">
                    {new Date(expiryDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  . This link cannot be used to change your response.
                </>
              ) : (
                <>
                  The acceptance period for this offer has ended. This link
                  cannot be used to record a response.
                </>
              )}
            </p>
            <p className="text-[13px] text-slate-500 dark:text-neutral-500 leading-relaxed pt-3">
              To discuss the role or a revised offer, contact the hiring team
              directly.
            </p>
          </>
        )}

        {(outcome === "invalid_link" || outcome === "error") && (
          <>
            <IconCircle variant="muted">
              <AlertIcon />
            </IconCircle>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100 mb-3 tracking-tight">
              Link could not be processed
            </h1>
            <p className="text-[15px] text-slate-600 dark:text-neutral-400 leading-relaxed">
              This request could not be completed. The link may be incorrect,
              incomplete, or no longer valid.
            </p>
            <p className="text-[13px] text-slate-500 dark:text-neutral-500 leading-relaxed pt-3">
              Please contact the hiring organization for a new link or for
              assistance.
            </p>
          </>
        )}

        <p className="text-[11px] text-slate-400 dark:text-neutral-600 uppercase tracking-wider pt-8 border-t border-slate-100 dark:border-neutral-800 mt-8">
          OpenATS
        </p>
      </div>
    </div>
  );
}
