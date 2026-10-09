"use client";

import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAiSettings, useUpdateAiSettings } from "@/hooks/queries/use-settings";
import { useIsManager } from "@/hooks/use-role";

/**
 * The one switch for AI CV analysis. It is off unless someone turns it on, and it says plainly
 * where the CVs go, because turning it on shares candidates' personal data with a third party.
 */
export function AiAnalysisCard() {
  const isManager = useIsManager();
  const { data, isPending, isError } = useAiSettings();
  const update = useUpdateAiSettings();

  const settings = data?.data;
  const configured = settings?.geminiConfigured ?? false;
  // Shown as on only when it is really in effect: chosen, and the server has a key.
  const on = settings?.active ?? false;

  const handleChange = (next: boolean) =>
    update.mutate(next, {
      onSuccess: () => toast.success(next ? "AI CV analysis turned on" : "AI CV analysis turned off"),
      onError: (error) => toast.error(error.message || "Failed to change the setting"),
    });

  return (
    <section className="rounded-lg border border-slate-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="ai-cv-analysis-title" className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            AI CV analysis
          </h2>
          <p id="ai-cv-analysis-note" className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Sends candidates&apos; CVs to Google Gemini, which writes a short summary with strengths and
            gaps for each one.
          </p>
        </div>
        <Switch
          aria-labelledby="ai-cv-analysis-title"
          aria-describedby="ai-cv-analysis-note"
          checked={on}
          disabled={isPending || isError || !configured || !isManager || update.isPending}
          onCheckedChange={handleChange}
          className="mt-0.5 data-checked:bg-theme"
        />
      </div>

      <p className="mt-3 text-sm text-slate-700 dark:text-neutral-300">
        {isPending ? (
          "Checking…"
        ) : isError ? (
          <span className="text-red-700 dark:text-red-400">Could not load this setting. Try refreshing the page.</span>
        ) : !configured ? (
          <span className="font-medium text-amber-800 dark:text-amber-300">
            Add a Gemini API key to use this.{" "}
            <span className="font-normal text-slate-600 dark:text-neutral-400">
              Set <code className="rounded bg-slate-100 px-1 py-0.5 text-[13px] dark:bg-neutral-800">GEMINI_API_KEY</code>{" "}
              for the backend and restart it.
            </span>
          </span>
        ) : on ? (
          "On. A CV is analysed when a candidate applies, or when their CV is replaced. The notes are not part of the candidate's score."
        ) : (
          "Off. No CV is sent anywhere. Analyses made earlier are kept, but hidden."
        )}
      </p>

      {!isManager && !isPending && !isError && configured && (
        <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
          Only admins and hiring managers can change this.
        </p>
      )}
    </section>
  );
}
