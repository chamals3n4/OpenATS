import { integrations } from "@/app/(dashboard)/settings/integrations/lib/integrations";
import { IntegrationCard } from "@/app/(dashboard)/settings/integrations/_components/integration-card";
import { GoogleMeetCard } from "@/app/(dashboard)/settings/integrations/_components/google-meet-card";
import type { IntegrationStatus } from "@/hooks/queries/use-integrations";

export function IntegrationsGrid({
  initialStatus,
}: {
  initialStatus: IntegrationStatus[];
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">Interview tools</h2>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-neutral-400">Video meeting providers available for your workspace.</p>
        </div>
        <span className="shrink-0 text-[13px] text-slate-400 dark:text-neutral-500">{integrations.length} integrations</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {integrations.map((integration) =>
        integration.provider === "google_meet" ? (
          <GoogleMeetCard key={integration.name} initialStatus={initialStatus} />
        ) : (
          <IntegrationCard key={integration.name} integration={integration} />
        ),
      )}
      </div>
    </section>
  );
}
