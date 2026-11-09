"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import { useRole } from "@/hooks/use-role";
import {
  useDisconnectParaform,
  useParaformAccess,
  useParaformConnectUrl,
  useParaformOverview,
  useSetParaformDecisions,
} from "@/hooks/queries/use-paraform";
import { ParaformRoles } from "./paraform-roles";
import { ParaformSyncLog } from "./paraform-sync-log";

type PillState = "connected" | "not_connected" | "reconnect" | "waiting_access";

const PILL: Record<PillState, { label: string; cls: string }> = {
  connected: {
    label: "Connected",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  not_connected: {
    label: "Not connected",
    cls: "border-slate-300 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  reconnect: {
    label: "Reconnect needed",
    cls: "border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-300",
  },
  waiting_access: {
    label: "Waiting for Paraform",
    cls: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
};

/**
 * Paraform, the recruiter marketplace: candidates its recruiters submit appear in the linked
 * job's first stage, and moving them on or rejecting them can be sent back. One connection for
 * the company, so only super admins see this.
 */
export function ParaformSection() {
  const { isSuperAdmin } = useRole();
  const overview = useParaformOverview();
  const data = overview.data?.data;
  const connected = Boolean(data?.connected && !data.needsReconnect);
  const access = useParaformAccess(isSuperAdmin && connected);
  const connectUrl = useParaformConnectUrl();
  const disconnect = useDisconnectParaform();
  const setDecisions = useSetParaformDecisions();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  if (!isSuperAdmin) return null;

  const hasAccess = access.data?.data.access === "ok";
  const state: PillState = !data?.connected
    ? "not_connected"
    : data.needsReconnect
      ? "reconnect"
      : access.data?.data.access === "no_access"
        ? "waiting_access"
        : "connected";
  const pill = PILL[state];

  const connect = () =>
    connectUrl.mutate(undefined, {
      onSuccess: (res) => {
        window.location.href = res.data.url;
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <header className="border-b border-slate-300 px-5 py-4 sm:px-6 dark:border-neutral-700">
        <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
          Hiring partners
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          Candidates that outside recruiters send you, brought straight into
          your jobs. One connection for the whole company; only super admins see
          this.
        </p>
      </header>

      {overview.isError && !data ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Could not load the Paraform connection.
          </p>
          <Button
            variant="cancel"
            className="h-8 px-3 text-sm"
            onClick={() => overview.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-slate-300 dark:divide-neutral-700">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-lg font-semibold text-slate-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              P
            </span>
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
                  Paraform
                </h3>
                {data && (
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-medium ${pill.cls}`}
                  >
                    {pill.label}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                Every 15 minutes, new candidates submitted on Paraform are added
                to the job you link each role to. They start in the first stage,
                marked as from Paraform.
              </p>
              {data?.connected && data.accountEmail && (
                <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                  Connected as{" "}
                  <span className="font-medium text-slate-900 dark:text-neutral-100">
                    {data.accountEmail}
                  </span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {data?.connected && (
                <Button
                  type="button"
                  variant="cancel"
                  onClick={() => setConfirmDisconnect(true)}
                  className="h-9 px-4 text-sm"
                >
                  Disconnect
                </Button>
              )}
              {(!data?.connected || data.needsReconnect) && (
                <Button
                  type="button"
                  onClick={connect}
                  disabled={connectUrl.isPending || !data}
                  className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover disabled:opacity-60"
                >
                  {connectUrl.isPending && <Spinner className="size-3.5" />}
                  {connectUrl.isPending
                    ? "Opening Paraform"
                    : data?.needsReconnect
                      ? "Reconnect"
                      : "Connect"}
                </Button>
              )}
            </div>
          </div>

          {data?.needsReconnect && (
            <p className="px-5 py-4 text-sm text-red-800 sm:px-6 dark:text-red-300">
              Paraform stopped accepting the sign-in, so nothing is syncing.
              Press Reconnect and sign in again; your linked roles stay as they
              are.
            </p>
          )}

          {state === "waiting_access" && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <p className="max-w-2xl text-sm text-amber-900 dark:text-amber-200">
                You&apos;re signed in, but Paraform hasn&apos;t given this
                account access for connected apps yet. Ask your Paraform contact
                to turn on hiring-manager access for{" "}
                {data?.accountEmail ?? "this account"}, then check again.
              </p>
              <Button
                variant="cancel"
                className="h-8 px-3 text-sm"
                disabled={access.isFetching}
                onClick={() => access.refetch()}
              >
                {access.isFetching ? "Checking" : "Check again"}
              </Button>
            </div>
          )}

          {connected && hasAccess && data && (
            <>
              <ParaformRoles roleLinks={data.roleLinks} />

              <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="max-w-2xl">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                    Tell Paraform about your decisions
                  </h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                    When you move a Paraform candidate past the first stage,
                    they are advanced on Paraform. When you reject one, the
                    recruiter is told. Off until you turn it on.
                  </p>
                </div>
                <Switch
                  checked={data.sendDecisions}
                  disabled={setDecisions.isPending}
                  aria-label="Tell Paraform about your decisions"
                  onCheckedChange={(checked: boolean) =>
                    setDecisions.mutate(checked, {
                      onSuccess: () =>
                        toast.success(
                          checked
                            ? "Decisions will be sent to Paraform"
                            : "Decisions stay in OpenATS",
                        ),
                      onError: (error) => toast.error(error.message),
                    })
                  }
                />
              </div>

              <ParaformSyncLog />
            </>
          )}
        </div>
      )}

      <ConfirmDeleteDialog
        open={confirmDisconnect}
        title="Disconnect Paraform?"
        description={
          <>
            <ConfirmDeleteName>
              {data?.accountEmail ?? "The Paraform account"}
            </ConfirmDeleteName>{" "}
            will stop syncing. Candidates already imported stay in their jobs,
            and your linked roles are kept for when you connect again.
          </>
        }
        confirmLabel="Disconnect"
        pendingLabel="Disconnecting"
        isPending={disconnect.isPending}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={() =>
          disconnect.mutate(undefined, {
            onSuccess: () => {
              setConfirmDisconnect(false);
              toast.success("Paraform disconnected");
            },
            onError: () => toast.error("Couldn't disconnect. Try again."),
          })
        }
      />
    </section>
  );
}
