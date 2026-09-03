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
import { Spinner } from "@/components/ui/spinner";

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
      status={
        status?.connected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">
            Available
          </span>
        )
      }
    >
      {status?.connected ? (
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[12px] text-slate-500 dark:text-neutral-400">
            <span className="font-medium text-slate-700 dark:text-neutral-200">
              {status.accountEmail}
            </span>
          </p>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnect.isPending}
            className="shrink-0 cursor-pointer text-sm font-medium text-red-500 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
          >
            {disconnect.isPending ? "Disconnecting" : "Disconnect"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={authorizeUrl.isPending}
          className={integrationConnectButtonClassName}
        >
          {authorizeUrl.isPending && <Spinner className="size-3.5" />}
          {authorizeUrl.isPending ? "Redirecting" : "Connect Google Meet"}
        </button>
      )}
    </IntegrationCardShell>
  );
}
