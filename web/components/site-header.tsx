"use client";

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
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import { Button } from "./ui/button";

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
      <div className="flex h-(--header-height) w-full items-center justify-between gap-4 px-6">
        <div className="min-w-0 flex-1 overflow-hidden">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {routeCrumbs.length === 0 ? (
                  <BreadcrumbPage className="text-slate-600 dark:text-neutral-300 font-medium">
                    OpenATS
                  </BreadcrumbPage>
                ) : (
                  <>
                    <BreadcrumbLink
                      href="/"
                      className="text-slate-400 dark:text-neutral-500 font-medium hover:text-slate-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      OpenATS
                    </BreadcrumbLink>
                    <BreadcrumbSeparator className="text-slate-300 dark:text-neutral-700">
                      <span className="text-lg font-light">&gt;</span>
                    </BreadcrumbSeparator>
                  </>
                )}
              </BreadcrumbItem>

              {routeCrumbs.map((crumb, i) => {
                const isLast = i === routeCrumbs.length - 1;
                return (
                  <BreadcrumbItem key={crumb.href}>
                    {!isLast ? (
                      <>
                        <BreadcrumbLink
                          href={crumb.href}
                          className="text-slate-400 dark:text-neutral-500 font-medium hover:text-slate-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          {crumb.label}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator className="text-slate-300 dark:text-neutral-700">
                          <span className="text-lg font-light">&gt;</span>
                        </BreadcrumbSeparator>
                      </>
                    ) : (
                      <BreadcrumbPage className="text-slate-600 dark:text-neutral-300 font-medium">
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            aria-label="Notifications"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <HugeiconsIcon icon={Notification03Icon} className="size-5" />
<<<<<<< HEAD
          </button>

          <Avatar className="size-9 border-2 border-slate-100 dark:border-neutral-800">
            <AvatarImage
              src="https://avatars.githubusercontent.com/u/172094470?s=400&u=f484cb0ec08ab3385c8553a5ad9f0c9f895460fc&v=4"
              alt="User"
            />
            <AvatarFallback className="bg-orange-100 text-orange-600 font-medium">
              JD
            </AvatarFallback>
          </Avatar>
=======
          </Button>
          <SidebarUserMenu variant="header" />
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
        </div>
      </div>
    </header>
  );
}
