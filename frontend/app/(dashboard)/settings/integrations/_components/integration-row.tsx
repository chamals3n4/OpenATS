import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Integration, IntegrationState } from "../lib/integrations";

interface IntegrationRowProps {
  integration: Integration;
  state: IntegrationState;
  accountEmail: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const PILL: Record<IntegrationState, { label: string; cls: string }> = {
  connected: {
    label: "Connected",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  not_connected: {
    label: "Not connected",
    cls: "border-slate-300 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  coming_soon: {
    label: "Coming soon",
    cls: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
};

/** One app: what it does, whether it is connected, and the one action that makes sense. */
export function IntegrationRow({
  integration,
  state,
  accountEmail,
  isConnecting,
  onConnect,
  onDisconnect,
}: IntegrationRowProps) {
  const pill = PILL[state];

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800">
        <Image
          src={integration.logo}
          alt=""
          width={28}
          height={28}
          className={`object-contain ${state === "coming_soon" ? "opacity-60 grayscale" : ""}`}
        />
      </span>

      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
            {integration.name}
          </h3>
          <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${pill.cls}`}>
            {pill.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">{integration.description}</p>
        {state === "connected" && accountEmail && (
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Connected as{" "}
            <span className="font-medium text-slate-900 dark:text-neutral-100">{accountEmail}</span>
          </p>
        )}
      </div>

      <div className="shrink-0">
        {state === "connected" ? (
          <Button
            type="button"
            variant="cancel"
            onClick={onDisconnect}
            className="h-9 px-4 text-sm"
          >
            Disconnect
          </Button>
        ) : state === "not_connected" ? (
          <Button
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover disabled:opacity-60"
          >
            {isConnecting && <Spinner className="size-3.5" />}
            {isConnecting ? "Opening Google" : "Connect"}
          </Button>
        ) : (
          <Button type="button" variant="cancel" disabled className="h-9 px-4 text-sm">
            Not available yet
          </Button>
        )}
      </div>
    </li>
  );
}
