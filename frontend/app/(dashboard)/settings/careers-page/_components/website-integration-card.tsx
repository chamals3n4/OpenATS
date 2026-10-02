import { CopyButton } from "./copy-button";

interface WebsiteIntegrationCardProps {
  embedSnippet: string;
  jobsApiUrl: string;
  jobApiUrl: string;
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-slate-300 bg-slate-100 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100">
      {children}
    </pre>
  );
}

function ApiRow({ label, url, note }: { label: string; url: string; note: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-slate-300 bg-gray-100 px-3 dark:border-neutral-600 dark:bg-neutral-800">
          <span className="shrink-0 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-px font-mono text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            GET
          </span>
          <code className="truncate font-mono text-sm text-slate-900 dark:text-neutral-100">{url}</code>
        </div>
        <CopyButton text={url} label={`${label.toLowerCase()} API address`} />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{note}</p>
    </div>
  );
}

/** Two ways to show the jobs on another website: paste a snippet, or build on the API. */
export function WebsiteIntegrationCard({ embedSnippet, jobsApiUrl, jobApiUrl }: WebsiteIntegrationCardProps) {
  return (
    <section className="rounded-lg border border-slate-300 bg-white p-5 sm:p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
        Show jobs on your own website
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
        Paste this where the job list should appear. The website must be in the allowed websites list.
      </p>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-800 dark:text-neutral-200">Embed snippet</h3>
          <CopyButton text={embedSnippet} label="embed snippet" withText />
        </div>
        <Block>{embedSnippet}</Block>
      </div>

      <details className="group mt-5 border-t border-slate-300 pt-4 dark:border-neutral-700">
        <summary className="cursor-pointer text-sm font-medium text-slate-800 select-none marker:text-slate-500 dark:text-neutral-200">
          Building your own design? Use the API
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            No sign-in is needed. Every response has the shape{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs dark:bg-neutral-800">
              {'{ "data": … }'}
            </code>
            .
          </p>
          <ApiRow label="All published jobs" url={jobsApiUrl} note="Returns every published job." />
          <ApiRow label="One job" url={jobApiUrl} note="Replace 42 with the id of a published job." />
        </div>
      </details>
    </section>
  );
}
