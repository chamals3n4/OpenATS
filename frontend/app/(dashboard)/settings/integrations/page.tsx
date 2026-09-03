import { Suspense } from "react";
import { serverFetch } from "@/lib/auth-action";
import { IntegrationsGrid } from "@/app/(dashboard)/settings/integrations/_components/integrations-grid";
import { OAuthCallbackToast } from "@/app/(dashboard)/settings/integrations/_components/oauth-callback-toast";
import type { IntegrationStatus } from "@/hooks/queries/use-integrations";

export default async function SettingsIntegrationsPage() {
  const { data: initialStatus } = await serverFetch<{ data: IntegrationStatus[] }>(
    "/integrations/status",
  );

  return (
    <div className="flex flex-1 flex-col bg-slate-50 dark:bg-neutral-950">
      <Suspense fallback={null}>
        <OAuthCallbackToast />
      </Suspense>

      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-neutral-800 dark:bg-neutral-950 sm:px-6">
        <div>
          <p className="text-sm font-medium text-[var(--theme-color)]">Workspace settings</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-neutral-100">
            Connected apps
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Connect the tools your team uses to run interviews and hiring workflows.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <IntegrationsGrid initialStatus={initialStatus} />
      </div>
    </div>
  );
}
