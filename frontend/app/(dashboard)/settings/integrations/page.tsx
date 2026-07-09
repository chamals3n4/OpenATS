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
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <Suspense fallback={null}>
        <OAuthCallbackToast />
      </Suspense>

      <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-neutral-100 leading-none">
          Integrations
        </h1>
        <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
          Connect third-party tools to power your hiring workflow
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <IntegrationsGrid initialStatus={initialStatus} />
      </div>
    </div>
  );
}
