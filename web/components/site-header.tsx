"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon } from "@hugeicons/core-free-icons";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SEGMENT_LABELS: Record<string, string> = {
  "": "Dashboard",
  assessments: "Assessments",
  candidates: "Candidates",
  jobs: "Manage Jobs",
  offers: "Offers",
  settings: "Settings",
  new: "New",
  pipeline: "Pipeline",
  general: "General",
  profile: "Profile",
  theme: "Theme",
  archive: "Archive",
  templates: "Templates",
};

function labelFor(segment: string) {
  return (
    SEGMENT_LABELS[segment] ??
    segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  // Build crumbs from path segments
  const segments = pathname.split("/").filter(Boolean);

  const routeCrumbs =
    segments.length === 0
      ? [{ label: "Dashboard", href: "/" }]
      : segments.map((seg, i) => ({
          label: labelFor(seg),
          href: "/" + segments.slice(0, i + 1).join("/"),
        }));

  return (
    <header className="bg-white dark:bg-neutral-950 sticky top-0 z-50 flex w-full items-center border-b border-slate-100 dark:border-neutral-800">
      <div className="flex h-(--header-height) w-full items-center justify-between px-6">
        <Breadcrumb>
          <BreadcrumbList>
            {routeCrumbs.length === 0 ? (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-slate-600 dark:text-neutral-300 font-medium">
                  OpenATS
                </BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/"
                    className="text-slate-400 dark:text-neutral-500 font-medium hover:text-slate-600 dark:hover:text-neutral-300 transition-colors"
                  >
                    OpenATS
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-slate-300 dark:text-neutral-700">
                  <span className="text-lg font-light">&gt;</span>
                </BreadcrumbSeparator>
                {routeCrumbs.map((crumb, i) => {
                  const isLast = i === routeCrumbs.length - 1;
                  return (
                    <Fragment key={crumb.href}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="text-slate-600 dark:text-neutral-300 font-medium">
                            {crumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            href={crumb.href}
                            className="text-slate-400 dark:text-neutral-500 font-medium hover:text-slate-600 dark:hover:text-neutral-300 transition-colors"
                          >
                            {crumb.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && (
                        <BreadcrumbSeparator className="text-slate-300 dark:text-neutral-700">
                          <span className="text-lg font-light">&gt;</span>
                        </BreadcrumbSeparator>
                      )}
                    </Fragment>
                  );
                })}
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-4">
          <button className="flex items-center justify-center size-9 rounded-full bg-slate-100/80 dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors">
            <HugeiconsIcon icon={Notification03Icon} className="size-5" />
          </button>

          <Avatar className="size-9 border-2 border-slate-100 dark:border-neutral-800">
            <AvatarImage src="https://t3.ftcdn.net/jpg/02/73/71/46/360_F_273714684_GXTZHmfFM3yvZwP7KaGc1h2Md00F83UF.jpg" alt="User" />
            <AvatarFallback className="bg-orange-100 text-orange-600 font-medium">
              JD
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
