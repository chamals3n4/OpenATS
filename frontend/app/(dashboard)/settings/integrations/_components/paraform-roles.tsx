"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useJobs } from "@/hooks/queries/use-jobs";
import {
  useLinkParaformRole,
  useParaformRoles,
  useUnlinkParaformRole,
  type ParaformOverview,
} from "@/hooks/queries/use-paraform";

/** Which Paraform role feeds which job. One role per job, one job per role. */
export function ParaformRoles({
  roleLinks,
}: {
  roleLinks: ParaformOverview["roleLinks"];
}) {
  const roles = useParaformRoles(true);
  const jobs = useJobs();
  const link = useLinkParaformRole();
  const unlink = useUnlinkParaformRole();
  const [roleId, setRoleId] = useState("");
  const [jobId, setJobId] = useState("");

  const linkedRoleIds = new Set(roleLinks.map((l) => l.paraformRoleId));
  const linkedJobIds = new Set(roleLinks.map((l) => l.jobId));
  const freeRoles = (roles.data?.data ?? []).filter(
    (r) => !linkedRoleIds.has(r.id),
  );
  const freeJobs = (jobs.data?.data ?? []).filter(
    (j) => !linkedJobIds.has(j.id),
  );

  const submit = () => {
    const role = freeRoles.find((r) => r.id === roleId);
    if (!role || !jobId) return;
    link.mutate(
      {
        paraformRoleId: role.id,
        paraformRoleTitle: role.title,
        jobId: Number(jobId),
      },
      {
        onSuccess: () => {
          setRoleId("");
          setJobId("");
          toast.success(
            `"${role.title}" linked. Its candidates arrive with the next sync.`,
          );
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="px-5 py-4 sm:px-6">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
        Roles and jobs
      </h4>
      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
        Pick the job each Paraform role should fill. Roles you don&apos;t link
        are left alone.
      </p>

      {roleLinks.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-300 dark:divide-neutral-800 dark:border-neutral-700">
          {roleLinks.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="text-slate-900 dark:text-neutral-100">
                <span className="font-medium">{l.paraformRoleTitle}</span>
                <span className="text-slate-500 dark:text-neutral-400">
                  {" "}
                  →{" "}
                </span>
                {l.jobTitle}
                <span className="ml-2 text-slate-500 dark:text-neutral-400">
                  {l.candidatesImported}{" "}
                  {l.candidatesImported === 1 ? "candidate" : "candidates"} so
                  far
                </span>
              </span>
              <Button
                variant="cancel"
                className="h-8 px-3 text-sm"
                disabled={unlink.isPending}
                onClick={() =>
                  unlink.mutate(l.id, {
                    onSuccess: () =>
                      toast.success(
                        "Unlinked. Candidates already imported stay.",
                      ),
                    onError: (error) => toast.error(error.message),
                  })
                }
              >
                Unlink
              </Button>
            </li>
          ))}
        </ul>
      )}

      {roles.isError ? (
        <p className="mt-3 text-sm text-amber-900 dark:text-amber-200">
          {roles.error.message}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Paraform role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            disabled={roles.isLoading || freeRoles.length === 0}
            className="min-w-56"
          >
            <option value="">
              {roles.isLoading
                ? "Loading Paraform roles…"
                : freeRoles.length
                  ? "Paraform role"
                  : "All roles are linked"}
            </option>
            {freeRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Job"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            disabled={freeJobs.length === 0}
            className="min-w-56"
          >
            <option value="">
              {freeJobs.length ? "Job in OpenATS" : "Every job is linked"}
            </option>
            {freeJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </NativeSelect>
          <Button
            type="button"
            onClick={submit}
            disabled={!roleId || !jobId || link.isPending}
            className="h-9 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover disabled:opacity-60"
          >
            {link.isPending ? "Linking" : "Link"}
          </Button>
        </div>
      )}
    </div>
  );
}
