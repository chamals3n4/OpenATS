"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { FormField, inputCls } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MAX_ORIGINS, normalizeOrigin, sameOrigins } from "../lib/careers-utils";

interface AllowedWebsitesCardProps {
  /** What is saved on the server. */
  saved: string[];
  isLoading: boolean;
  loadError: string | null;
  isSaving: boolean;
  onRetry: () => void;
  onSave: (origins: string[]) => void;
}

/**
 * Which websites may load the jobs. Changes are made here and only take effect on Save, so
 * there is a clear way to back out.
 */
export function AllowedWebsitesCard({
  saved,
  isLoading,
  loadError,
  isSaving,
  onRetry,
  onSave,
}: AllowedWebsitesCardProps) {
  const [origins, setOrigins] = useState(saved);
  const [seeded, setSeeded] = useState(saved);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // A fresh list from the server replaces the edits (after a save, or a reload).
  if (saved !== seeded) {
    setSeeded(saved);
    setOrigins(saved);
  }

  const dirty = !sameOrigins(origins, saved);

  const add = () => {
    const result = normalizeOrigin(draft);
    if (!result.ok) return setError(result.error);
    if (origins.includes(result.origin)) return setError("This website is already in the list.");
    if (origins.length >= MAX_ORIGINS) return setError(`You can allow up to ${MAX_ORIGINS} websites.`);
    setOrigins([...origins, result.origin]);
    setDraft("");
    setError(null);
  };

  const restricted = origins.length > 0;

  return (
    <section className="rounded-lg border border-slate-300 bg-white p-5 sm:p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Allowed websites
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Only these websites can load your jobs through the embed or the API. Your own careers page
            always works.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${
            restricted
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          {restricted ? `Limited to ${origins.length}` : "Open to any website"}
        </span>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/25"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-300">{loadError}</p>
          <Button type="button" variant="cancel" onClick={onRetry} className="h-8 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-300 dark:border-neutral-700">
            {isLoading ? (
              <div className="h-12 animate-pulse bg-slate-100 dark:bg-neutral-800" />
            ) : origins.length === 0 ? (
              <p className="px-4 py-3.5 text-sm text-slate-600 dark:text-neutral-400">
                No websites added, so any website can load your jobs. Add one to limit access.
              </p>
            ) : (
              <ul className="divide-y divide-slate-300 dark:divide-neutral-700">
                {origins.map((origin) => (
                  <li key={origin} className="flex items-center gap-3 px-4 py-2.5">
                    <code className="min-w-0 flex-1 truncate font-mono text-sm text-slate-900 dark:text-neutral-100">
                      {origin}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Remove ${origin}`}
                      title="Remove"
                      onClick={() => setOrigins(origins.filter((o) => o !== origin))}
                      className="size-8 shrink-0 rounded-md p-0 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            noValidate
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <FormField
              label="Add a website"
              htmlFor="allowed-origin"
              error={error}
              hint="The address of the site that will show your jobs, like https://jobs.example.com."
            >
              <div className="flex gap-2">
                <Input
                  id="allowed-origin"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://jobs.example.com"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (error) setError(null);
                  }}
                  className={`${inputCls} flex-1 font-mono`}
                />
                <Button type="submit" variant="cancel" className="h-10 shrink-0 gap-2 px-4 text-sm">
                  <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
                  Add
                </Button>
              </div>
            </FormField>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-300 pt-4 dark:border-neutral-700">
            <Button
              type="button"
              disabled={!dirty || isSaving || isLoading}
              onClick={() => onSave(origins)}
              className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover disabled:opacity-60"
            >
              {isSaving && <Spinner className="size-3.5" />}
              {isSaving ? "Saving" : "Save changes"}
            </Button>
            {dirty && !isSaving && (
              <>
                <Button
                  type="button"
                  variant="cancel"
                  onClick={() => {
                    setOrigins(saved);
                    setError(null);
                  }}
                  className="h-9 px-4 text-sm"
                >
                  Discard
                </Button>
                <p className="text-sm text-slate-600 dark:text-neutral-400">You have unsaved changes.</p>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
