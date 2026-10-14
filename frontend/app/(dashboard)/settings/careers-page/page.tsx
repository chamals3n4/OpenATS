"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/guards/role-guard";
import {
  useSettingsAllowedOrigins,
  useUpdateSettingsAllowedOrigins,
} from "@/hooks/queries/use-settings";
import { AllowedWebsitesCard } from "./_components/allowed-websites-card";
import { CareersLinkCard } from "./_components/careers-link-card";
import { WebsiteIntegrationCard } from "./_components/website-integration-card";
import { careersUrls } from "./_lib/careers-utils";

const NO_ORIGINS: string[] = [];

export default function CareersSettingsPage() {
  return (
    <RoleGuard allow="manager" redirectTo="/settings/general">
      <CareersSettings />
    </RoleGuard>
  );
}

function CareersSettings() {

  const { data, isLoading, isError, error, refetch } = useSettingsAllowedOrigins();
  const updateOrigins = useUpdateSettingsAllowedOrigins();

  const urls = useMemo(
    () => careersUrls(process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"),
    [],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-6xl space-y-6">
          <header>
            <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
              Careers page
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
              Where candidates find your open roles, and how to show them on your own website.
            </p>
          </header>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0 space-y-6">
              <CareersLinkCard url={urls.page} />
              <WebsiteIntegrationCard
                embedSnippet={urls.embed}
                jobsApiUrl={urls.jobsApi}
                jobApiUrl={urls.jobApi}
              />
            </div>

            <div className="xl:sticky xl:top-0">
              <AllowedWebsitesCard
                saved={data?.data?.origins ?? NO_ORIGINS}
                isLoading={isLoading}
                loadError={
                  isError
                    ? error?.message === "Forbidden"
                      ? "This isn't available for your account."
                      : (error?.message ?? "Could not load the allowed websites.")
                    : null
                }
                isSaving={updateOrigins.isPending}
                onRetry={() => refetch()}
                onSave={(origins) =>
                  updateOrigins.mutate(origins, {
                    onSuccess: () => toast.success("Allowed websites saved"),
                    onError: (e: Error) => toast.error(e.message || "Could not save"),
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
