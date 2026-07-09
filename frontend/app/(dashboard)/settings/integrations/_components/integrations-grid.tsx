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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {integrations.map((integration) =>
        integration.provider === "google_meet" ? (
          <GoogleMeetCard key={integration.name} initialStatus={initialStatus} />
        ) : (
          <IntegrationCard key={integration.name} integration={integration} />
        ),
      )}
    </div>
  );
}
