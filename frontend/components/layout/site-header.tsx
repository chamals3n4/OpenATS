"use client";

import Link from "next/link";
import Image from "next/image";

import { SidebarUserMenu } from "@/components/layout/sidebar-user-menu";
import { NotificationsPanel } from "@/components/layout/notifications-panel";

export function SiteHeader() {
  return (
    <header className="bg-sidebar sticky top-0 z-50 flex w-full items-center border-b border-sidebar-border">
      <div className="flex h-(--header-height) w-full items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight text-black dark:text-white select-none"
        >
          <Image
            src="/assets/openats-logo.png"
            alt="OpenATS"
            width={32}
            height={32}
            className="size-8 object-contain dark:brightness-0 dark:invert"
          />
          OpenATS
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <NotificationsPanel />
          <SidebarUserMenu variant="header" />
        </div>
      </div>
    </header>
  );
}
