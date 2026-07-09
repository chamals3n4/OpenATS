"use client";

import { toast } from "sonner";
import {
  IntegrationCardShell,
  integrationConnectButtonClassName,
} from "@/app/(dashboard)/settings/integrations/_components/integration-card";
import {
  useIntegrationStatus,
  useGoogleAuthorizeUrl,
  useDisconnectGoogle,
  type IntegrationStatus,
} from "@/hooks/queries/use-integrations";

export function GoogleMeetCard({
  initialStatus,
}: {
  initialStatus: IntegrationStatus[];
}) {
  const { data } = useIntegrationStatus(initialStatus);
  const authorizeUrl = useGoogleAuthorizeUrl();
  const disconnect = useDisconnectGoogle();

  const status = data?.data.find((s) => s.provider === "google_meet");

  const handleConnect = () => {
    authorizeUrl.mutate(undefined, {
      onSuccess: (res) => {
        window.location.href = res.data.url;
      },
      onError: () => toast.error("Couldn't start Google connection. Try again."),
    });
  };

  const handleDisconnect = () => {
    disconnect.mutate(undefined, {
      onSuccess: () => toast.success("Google Meet disconnected"),
      onError: () => toast.error("Failed to disconnect"),
    });
  };

  return (
    <IntegrationCardShell
      name="Google Meet"
      logo="/integrations/meet.webp"
      description="Automatically create Google Meet links for scheduled interviews."
    >
      {status?.connected ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">
            Connected as{" "}
            <span className="font-medium text-slate-700 dark:text-neutral-200">
              {status.accountEmail}
            </span>
          </p>
          <button
            onClick={handleDisconnect}
            disabled={disconnect.isPending}
            className="inline-flex h-9 w-full items-center justify-center rounded-md border border-slate-200 dark:border-neutral-700 text-sm font-medium text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={authorizeUrl.isPending}
          className={integrationConnectButtonClassName}
          style={{ backgroundColor: "var(--theme-color)" }}
        >
          {authorizeUrl.isPending ? "Redirecting…" : "Connect"}
        </button>
      )}
    </IntegrationCardShell>
  );
}
