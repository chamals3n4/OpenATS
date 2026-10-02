"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import {
  useDisconnectGoogle,
  useGoogleAuthorizeUrl,
  useIntegrationStatus,
  type IntegrationStatus,
} from "@/hooks/queries/use-integrations";
import { IntegrationRow } from "./integration-row";
import { VIDEO_MEETING_INTEGRATIONS, stateOf } from "../lib/integrations";

export function IntegrationsList({ initialStatus }: { initialStatus: IntegrationStatus[] | null }) {
  const status = useIntegrationStatus(initialStatus ?? undefined);
  const authorizeUrl = useGoogleAuthorizeUrl();
  const disconnect = useDisconnectGoogle();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const statuses = status.data?.data;
  const google = stateOf(VIDEO_MEETING_INTEGRATIONS[0], statuses);

  const connect = () =>
    authorizeUrl.mutate(undefined, {
      onSuccess: (res) => {
        window.location.href = res.data.url;
      },
      onError: () => toast.error("Couldn't start the Google connection. Try again."),
    });

  const handleDisconnect = () =>
    disconnect.mutate(undefined, {
      onSuccess: () => {
        setConfirmDisconnect(false);
        toast.success("Google Meet disconnected");
      },
      onError: () => toast.error("Couldn't disconnect. Try again."),
    });

  if (status.isError && !statuses) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-5 py-4 dark:border-red-900/50 dark:bg-red-950/25"
      >
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          Could not load your connections.
        </p>
        <Button variant="cancel" className="h-8 px-3 text-sm" onClick={() => status.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <header className="border-b border-slate-300 px-5 py-4 sm:px-6 dark:border-neutral-700">
        <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">Video meetings</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
Apps that create a meeting link for each interview you schedule.
        </p>
      </header>

      <ul className="divide-y divide-slate-300 dark:divide-neutral-700">
        {VIDEO_MEETING_INTEGRATIONS.map((integration) => {
          const { state, accountEmail } = stateOf(integration, statuses);
          return (
            <IntegrationRow
              key={integration.key}
              integration={integration}
              state={state}
              accountEmail={accountEmail}
              isConnecting={authorizeUrl.isPending}
              onConnect={connect}
              onDisconnect={() => setConfirmDisconnect(true)}
            />
          );
        })}
      </ul>

      <ConfirmDeleteDialog
        open={confirmDisconnect}
        title="Disconnect Google Meet?"
        description={
          <>
            <ConfirmDeleteName>{google.accountEmail ?? "Your Google account"}</ConfirmDeleteName>{" "}
            will no longer be able to create meeting links, and you won&apos;t be picked as an
            interviewer for new Google Meet interviews. Links already sent keep working, but their
            calendar events can&apos;t be cancelled from here.
          </>
        }
        confirmLabel="Disconnect"
        pendingLabel="Disconnecting"
        isPending={disconnect.isPending}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={handleDisconnect}
      />
    </section>
  );
}
