"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/queries/use-user";
import Link from "next/link";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import {
  useSettingsAllowedOrigins,
  useUpdateSettingsAllowedOrigins,
} from "@/hooks/queries/use-settings";

const inputCls =
  "h-9 rounded-md shadow-none bg-gray-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 text-sm font-mono";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-neutral-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
      <div className="min-w-0 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Endpoint({
  url,
  note,
  onCopy,
}: {
  url: string;
  note?: React.ReactNode;
  onCopy: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 dark:border-neutral-800">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="shrink-0 rounded bg-emerald-500/15 text-emerald-400 text-[11px] font-mono font-bold px-2 py-1">
          GET
        </span>
        <code className="flex-1 min-w-0 truncate text-[13px] font-mono text-slate-200">
          {url}
        </code>
        <button
          onClick={onCopy}
          className="shrink-0 flex items-center justify-center size-7 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Copy URL"
        >
          <Copy className="size-3.5" />
        </button>
      </div>
      {note && (
        <div className="px-4 py-2.5 border-t border-white/10 text-xs text-slate-400 font-mono">
          {note}
        </div>
      )}
    </div>
  );
}

export default function CareersSettingsPage() {
  const router = useRouter();
  const { data: currentUserRes, isLoading: isLoadingUser } = useCurrentUser();
  const role = currentUserRes?.data?.role;
  const isManager = role === "super_admin" || role === "hiring_manager";

  useEffect(() => {
    if (role && !isManager) router.replace("/settings/general");
  }, [role, isManager, router]);

  const { data, isLoading, isError, error, refetch } =
    useSettingsAllowedOrigins();
  const updateOrigins = useUpdateSettingsAllowedOrigins();

  const [origins, setOrigins] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  // Seed the editable list whenever the query returns a new one.
  const [seededOrigins, setSeededOrigins] = useState<string[] | null>(null);
  const fetchedOrigins = data?.data?.origins;
  if (Array.isArray(fetchedOrigins) && fetchedOrigins !== seededOrigins) {
    setSeededOrigins(fetchedOrigins);
    setOrigins(fetchedOrigins);
  }

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

  if (isLoadingUser || !role || !isManager) return null;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full">
          <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-theme">Publishing</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Careers page</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                Publish open roles on your own careers site.
              </p>
            </div>
        <Button
          className="h-9 shrink-0 rounded-md border border-theme bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover cursor-pointer"
          render={<Link href="/settings/careers-page/preview" prefetch />}
        >
          Open listing preview
        </Button>
          </header>
          <div className="space-y-5">
          <Section
            title="Allowed origins"
            description={
              <>
                Limit which websites can request jobs from your public API. Leave this empty to allow all origins.
              </>
            }
          >
            {isError && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-red-600 dark:text-red-400 mb-3 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3 py-2">
                <span>
                  {error?.message ?? "Could not load origins"}
                  {error?.message === "Forbidden"
                    ? " — this isn't available for your account."
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

            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-neutral-800">
              {!isLoading && origins.length === 0 && !isError ? (
                <p className="px-4 py-3 text-sm text-slate-500 dark:text-neutral-400">
                  All origins are currently allowed.
                </p>
              ) : (
                origins.map((o, i) => (
                  <div
                    key={`${o}-${i}`}
                    className={`flex items-center gap-2 px-4 py-2.5 ${
                      i !== 0 ? "border-t border-slate-100 dark:border-neutral-800" : ""
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <code className="text-sm text-slate-700 dark:text-neutral-200 flex-1 truncate font-mono">
                      {o}
                    </code>
                    <button
                      onClick={() => removeOrigin(i)}
                      aria-label={`Remove ${o}`}
                      className="shrink-0 flex items-center justify-center size-7 rounded-md text-slate-400 dark:text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
              <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
                <Input
                  placeholder="https://jobs.example.com"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addOrigin())
                  }
                  className={`flex-1 ${inputCls} bg-white dark:bg-neutral-900`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 shrink-0 rounded-md border-slate-200 dark:border-neutral-700 bg-white hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300"
                  onClick={addOrigin}
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                  Add
                </Button>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              className="h-9 px-4 mt-3 bg-theme hover:bg-theme-hover text-white rounded-md border border-theme shadow-none text-sm font-semibold cursor-pointer disabled:opacity-60"
              onClick={saveOrigins}
              disabled={isLoading || updateOrigins.isPending || isError}
            >
              {updateOrigins.isPending && <Spinner className="mr-2 size-3.5" />}
              {updateOrigins.isPending ? "Saving" : "Save origins"}
            </Button>
          </Section>

          <Section
            title="Public HTTP API"
            description={
              <>
                Use these endpoints to render open roles in a custom experience. No sign-in is required. Every response is shaped{" "}
                <code className="font-mono">{'{ "data": Job[] | Job }'}</code>
                .
              </>
            }
          >
            <div className="space-y-3">
              <Endpoint
                url={jobsListUrl}
                note="Returns all published jobs."
                onCopy={() => copyText("URL", jobsListUrl)}
              />
              <Endpoint
                url={jobDetailExampleUrl}
                note={
                  <>
                    Replace <span className="text-slate-200">42</span> with a
                    published job id.
                  </>
                }
                onCopy={() =>
                  copyText("Job detail URL", jobDetailExampleUrl)
                }
              />
            </div>
          </Section>

          <Section
            title="Embed snippet"
            description={
              <>
                Add this snippet to a website to show your open roles without building a custom integration.
              </>
            }
          >
            <div className="relative rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-950 dark:bg-black">
              <pre className="p-4 pr-24 text-[13px] text-slate-100 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
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
          </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
