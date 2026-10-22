"use client";

import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAiSettings, useUpdateAiSettings } from "@/hooks/queries/use-settings";
import { useRole } from "@/hooks/use-role";
import { SettingsSection } from "./settings-section";

/** AI CV analysis switch. Off by default since CVs go to a third party */
export function AiAnalysisCard() {
  const { isSuperAdmin } = useRole();
  const { data, isPending, isError } = useAiSettings();
  const update = useUpdateAiSettings();

  const settings = data?.data;
  const configured = settings?.geminiConfigured ?? false;
  // On only when enabled and the server has a key
  const on = settings?.active ?? false;

  const handleChange = (next: boolean) =>
    update.mutate(next, {
      onSuccess: () => toast.success(next ? "AI CV analysis turned on" : "AI CV analysis turned off"),
      onError: (error) => toast.error(error.message || "Failed to change the setting"),
    });

  return (
    <SettingsSection
      title="AI CV analysis"
      description={
        <span id="ai-cv-analysis-note">
          Sends candidates&apos; CVs to Google Gemini, which writes a short summary with strengths and
          gaps for each one.
        </span>
      }
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-slate-800 dark:text-neutral-200">
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

          {!isSuperAdmin && !isPending && !isError && configured && (
            <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
              Only a super admin can change this.
            </p>
          )}
        </div>
        <Switch
          aria-label="AI CV analysis"
          aria-describedby="ai-cv-analysis-note"
          checked={on}
          disabled={isPending || isError || !configured || !isSuperAdmin || update.isPending}
          onCheckedChange={handleChange}
          className="mt-0.5 shrink-0 data-checked:bg-theme"
        />
      </div>
    </SettingsSection>
  );
}
