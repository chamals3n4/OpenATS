"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSettingsAllowedOrigins,
  useUpdateSettingsAllowedOrigins,
} from "@/hooks/use-api";

const panel =
  "border border-slate-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-950";
const inputCls =
  "h-9 rounded-md shadow-none bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 focus-visible:ring-0 focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 text-sm";

export default function CareersSettingsPage() {
  const { data, isLoading, isError, error, refetch } =
    useSettingsAllowedOrigins();
  const updateOrigins = useUpdateSettingsAllowedOrigins();

  const [origins, setOrigins] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const list = data?.data?.origins;
    if (Array.isArray(list)) setOrigins(list);
  }, [data]);

  const appBase = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
    return env || "http://localhost:3000";
  }, []);

  const jobsListUrl = `${appBase}/api/public/jobs`;
  const jobDetailExampleUrl = `${appBase}/api/public/jobs/42`;

  const embedSnippet = `<div id="openats-jobs"></div>
<script src="${appBase}/embed.js" data-instance="${appBase}"></script>`;

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const saveOrigins = () => {
    updateOrigins.mutate(origins, {
      onSuccess: (res) => {
        setOrigins(res.data.origins);
        toast.success("Allowed origins saved");
      },
      onError: (e: Error) => toast.error(e.message || "Could not save"),
    });
  };

  const addOrigin = () => {
    const v = draft.trim();
    if (!v) return;
    if (origins.includes(v)) {
      toast.message("Already in the list");
      return;
    }
    setOrigins((o) => [...o, v]);
    setDraft("");
  };

  const removeOrigin = (idx: number) => {
    setOrigins((o) => o.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950 min-w-0">
      <div className="px-8 py-6 border-b border-slate-100 dark:border-neutral-800 shrink-0">
        <h1 className="text-[22px] font-semibold text-slate-900 dark:text-neutral-100 leading-none mb-2">
          Careers page
        </h1>
        <p className="text-sm text-slate-500 dark:text-neutral-400 max-w-3xl">
          Link your careers site or a custom page to OpenATS using the public job
          URLs or the embed snippet below—pick whichever fits your setup so
          visitors can browse listings and apply. Allowed origins control which
          websites those requests may come from.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8 min-w-0">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
          {/* Origins */}
          <section className={`xl:col-span-5 ${panel} p-5`}>
            <h2 className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200 uppercase tracking-wide mb-1">
              Allowed origins
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-500 mb-4 leading-relaxed">
              When this list is <strong className="font-medium text-slate-600 dark:text-neutral-400">non-empty</strong>
              , browser requests to public job APIs (list, detail, questions,
              apply, resume upload) must send an{" "}
              <code className="text-[11px] font-mono">Origin</code> that matches
              an entry (include your careers site, e.g.{" "}
              <code className="text-[11px] font-mono">http://localhost:3000</code>
              ). Empty list = no origin check.
            </p>
            {isError && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-red-600 dark:text-red-400 mb-3 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3 py-2">
                <span>
                  {error?.message ?? "Could not load origins"}
                  {error?.message === "Forbidden"
                    ? " — this isn’t available for your account."
                    : ""}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs text-red-700 dark:text-red-300"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </div>
            )}
            {isLoading && (
              <p className="text-sm text-slate-400 dark:text-neutral-500 mb-4 animate-pulse">
                Loading origins…
              </p>
            )}
            <ul className="space-y-1.5 mb-4">
              {!isLoading && origins.length === 0 && !isError ? (
                <li className="text-xs text-slate-500 dark:text-neutral-500 italic py-1">
                  No origins yet. Add e.g.{" "}
                  <code className="font-mono text-[11px]">http://localhost:3000</code>
                </li>
              ) : null}
              {origins.map((o, i) => (
                <li
                  key={`${o}-${i}`}
                  className="flex items-center gap-2 border border-slate-200 dark:border-neutral-800 rounded-md bg-slate-50/80 dark:bg-neutral-900/60 px-2.5 py-1.5"
                >
                  <code className="text-[12px] text-slate-800 dark:text-neutral-200 flex-1 truncate font-mono">
                    {o}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 rounded-md text-slate-500"
                    onClick={() => removeOrigin(i)}
                    aria-label={`Remove ${o}`}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end mb-3">
              <div className="flex-1 space-y-1.5 min-w-0">
                <Label
                  htmlFor="new-origin"
                  className="text-xs text-slate-600 dark:text-neutral-400"
                >
                  Add origin
                </Label>
                <Input
                  id="new-origin"
                  placeholder="https://jobs.example.com"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addOrigin())
                  }
                  className={inputCls}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 shrink-0 rounded-md"
                onClick={addOrigin}
              >
                <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                Add
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-md text-white shadow-none border-none text-[13px] disabled:opacity-60"
              style={{ backgroundColor: "var(--theme-color)" }}
              onClick={saveOrigins}
              disabled={isLoading || updateOrigins.isPending || isError}
            >
              {updateOrigins.isPending ? "Saving…" : "Save origins"}
            </Button>
          </section>

          {/* API + embed */}
          <div className="xl:col-span-7 flex flex-col gap-6 min-w-0">
            <section className={`${panel} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200 uppercase tracking-wide mb-1">
                    Public HTTP API
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-500">
                    Proxied by Next.js. No Asgardeo session required. Base below
                    uses{" "}
                    <code className="text-[11px] px-1 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 font-mono">
                      NEXT_PUBLIC_APP_URL
                    </code>{" "}
                    or localhost fallback.
                  </p>
                </div>
                <code className="text-[11px] text-slate-600 dark:text-neutral-400 font-mono px-2 py-1 rounded-md border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 truncate max-w-full">
                  {appBase}
                </code>
              </div>

              <div className="rounded-md border border-slate-200 dark:border-neutral-800 overflow-hidden">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/80">
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-neutral-400 w-16">
                        Method
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-neutral-400">
                        URL
                      </th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-neutral-400 w-24 text-right">
                        Copy
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12px]">
                    <tr className="border-b border-slate-100 dark:border-neutral-800/80">
                      <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        GET
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-neutral-200 break-all">
                        {jobsListUrl}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 rounded-md text-slate-600"
                          onClick={() => copyText("URL", jobsListUrl)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        GET
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-neutral-200 break-all">
                        {jobDetailExampleUrl}
                        <span className="text-slate-400 dark:text-neutral-500 font-sans text-[11px] block mt-0.5">
                          Replace <code className="font-mono">42</code> with a
                          published job id.
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 rounded-md text-slate-600"
                          onClick={() =>
                            copyText("Job detail URL", jobDetailExampleUrl)
                          }
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500 mt-2 font-mono">
                Response:{" "}
                <span className="text-slate-600 dark:text-neutral-400">
                  {"{ \"data\": Job[] | Job }"}
                </span>
                {" · "}
                List = published only; detail uses numeric{" "}
                <code className="text-slate-600 dark:text-neutral-400">id</code>
                .
              </p>
            </section>

            <section className={`${panel} p-5`}>
              <h2 className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200 uppercase tracking-wide mb-1">
                Embed snippet
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-500 mb-3">
                Drop on any site that can load your app’s{" "}
                <code className="text-[11px] font-mono">/embed.js</code> (same
                origin or CORS as you configure).
              </p>
              <div className="relative rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-950 dark:bg-black">
                <pre className="p-4 pr-24 text-[12px] text-slate-100 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                  {embedSnippet.trim()}
                </pre>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 h-8 gap-1.5 rounded-md text-xs"
                  onClick={() => copyText("Snippet", embedSnippet.trim())}
                >
                  <Copy className="size-3" />
                  Copy
                </Button>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  className="h-10 min-h-10 px-5 rounded-md text-sm font-medium text-white shadow-none border-0 w-full sm:w-auto justify-center hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "var(--theme-color)" }}
                  render={<Link href="/settings/careers/preview" prefetch />}
                >
                  Open listing preview
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
