import Image from "next/image";
import type { ReactNode } from "react";

export type Integration = {
  name: string;
  description: string;
  logo: string;
  url: string;
  availability?: "available" | "coming_soon";
  /** Present only for integrations with a real OAuth flow wired up */
  provider?: "google_meet";
};

export function IntegrationCardShell({
  name,
  logo,
  description,
  status,
  children,
}: {
  name: string;
  logo: string;
  description: string;
  status: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[188px] flex-col rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-800">
          <Image
            src={logo}
            alt={`${name} logo`}
            width={30}
            height={30}
            className="object-contain"
          />
        </div>
        {status}
      </div>
      <div className="mt-3.5 flex-1">
        <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
          {name}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export const integrationConnectButtonClassName =
  "inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-md border-none bg-[var(--theme-color)] text-sm font-medium text-white shadow-none transition-colors hover:bg-[var(--theme-color-hover)] disabled:cursor-not-allowed disabled:opacity-60";

export function IntegrationCard({ integration }: { integration: Integration }) {
  const isComingSoon = integration.availability === "coming_soon";

  return (
    <IntegrationCardShell
      name={integration.name}
      logo={integration.logo}
      description={integration.description}
      status={
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
          isComingSoon
            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
            : "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400"
        }`}>
          {isComingSoon ? "Coming soon" : "Available"}
        </span>
      }
    >
      {isComingSoon ? (
        <span className="inline-flex h-8 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-400 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-500">
          Coming soon
        </span>
      ) : (
        <a
          href={integration.url}
          target="_blank"
          rel="noopener noreferrer"
          className={integrationConnectButtonClassName}
        >
          Connect
        </a>
      )}
    </IntegrationCardShell>
  );
}
