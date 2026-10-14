import { Suspense } from "react";
import { serverFetch } from "@/lib/server-fetch";
import type { IntegrationStatus } from "@/hooks/queries/use-integrations";
import { IntegrationsList } from "./_components/integrations-list";
import { OAuthCallbackToast } from "./_components/oauth-callback-toast";

export default async function SettingsIntegrationsPage() {
  // A failed load is shown by the list, with a retry, instead of crashing the page.
  let initialStatus: IntegrationStatus[] | null = null;
  try {
    initialStatus = (await serverFetch<{ data: IntegrationStatus[] }>("/integrations/status")).data;
  } catch {
    initialStatus = null;
  }

  return (
    <div className="flex flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <Suspense fallback={null}>
        <OAuthCallbackToast />
      </Suspense>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
              Integrations
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
              Connect your own accounts so your interviews go in your calendar, with a meeting link.
            </p>
          </header>

          <p className="rounded-lg border border-slate-300 bg-white px-5 py-4 text-sm leading-relaxed text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            These connections are personal. Everyone who runs interviews connects their own account.
            When an interview gets its time, it is added to the calendar of the interviewer chosen
            for it, and the candidate is invited. An interviewer who has not connected an account
            gets no calendar entry. The candidate is still emailed the details.
          </p>

          <IntegrationsList initialStatus={initialStatus} />
        </div>
      </div>
    </div>
  );
}
