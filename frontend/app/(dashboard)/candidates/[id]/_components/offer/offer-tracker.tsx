import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { formatDate } from "../constants";
import {
  getOfferSteps,
  type OfferStep,
} from "../../lib/offer-utils";
import type { Offer } from "@/types";

function Marker({ step }: { step: OfferStep }) {
  const base = "relative z-10 flex size-7 items-center justify-center rounded-full";

  if (step.state === "negative") {
    return (
      <span className={`${base} bg-red-500 text-white`}>
        <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (step.state === "done") {
    // The candidate saying yes is the happy ending, so it gets its own colour.
    const color = step.key === "outcome" ? "bg-green-600" : "bg-theme";
    return (
      <span className={`${base} ${color} text-white`}>
        <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (step.state === "current") {
    return (
      <span className={`${base} border-2 border-theme bg-white dark:bg-neutral-900`}>
        <span className="size-2.5 rounded-full bg-theme" />
      </span>
    );
  }
  return (
    <span
      className={`${base} border-2 border-slate-300 bg-white dark:border-neutral-600 dark:bg-neutral-900`}
    />
  );
}

/** The offer's journey: created, sent, viewed, then the candidate's answer. */
export function OfferTracker({ offer }: { offer: Offer }) {
  const steps = getOfferSteps(offer);

  return (
    <ol className="grid grid-cols-4 gap-x-4">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        // The line leaving a step is solid once that step is finished.
        const lineDone = step.state === "done" || step.state === "negative";

        return (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex min-w-0 flex-col items-center text-center"
          >
            <Marker step={step} />
            {!isLast && (
              <span
                aria-hidden
                className={`absolute left-1/2 top-[13px] h-0.5 w-[calc(100%+1rem)] ${
                  lineDone && steps[i + 1].state !== "upcoming"
                    ? "bg-theme"
                    : "bg-slate-300 dark:bg-neutral-600"
                }`}
              />
            )}
            <p
              className={`mt-2.5 text-sm font-semibold ${
                step.state === "upcoming"
                  ? "text-slate-500 dark:text-neutral-500"
                  : step.state === "negative"
                    ? "text-red-700 dark:text-red-400"
                    : "text-slate-900 dark:text-neutral-100"
              }`}
            >
              {step.label}
            </p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
              {step.date
                ? formatDate(step.date)
                : step.state === "current"
                  ? "In progress"
                  : "Pending"}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
