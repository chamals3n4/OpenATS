"use client";

import Link from "next/link";
import { Public_Sans } from "next/font/google";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon } from "@hugeicons/core-free-icons";

import { SidebarUserMenu } from "@/components/layout/sidebar-user-menu";
import { Button } from "@/components/ui/button";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: "600",
});

export function SiteHeader({ accessToken }: { accessToken?: string }) {
  return (
    <header className="bg-white dark:bg-neutral-950 sticky top-0 z-50 flex w-full items-center border-b border-slate-100 dark:border-neutral-800">
      <div className="flex h-(--header-height) w-full items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className={`${publicSans.className} text-2xl leading-none tracking-tight text-black dark:text-white select-none`}
        >
          OpenATS
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            aria-label="Notifications"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <HugeiconsIcon icon={Notification03Icon} className="size-5" />
          </Button>
          <SidebarUserMenu variant="header" accessToken={accessToken} />
        </div>
      </div>
    </header>
  );
}
