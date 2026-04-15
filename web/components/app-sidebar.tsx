"use client";

import * as React from "react";
import { Public_Sans } from "next/font/google";
import {
  Home01Icon,
  Briefcase01Icon,
  UserGroupIcon,
  SearchList02Icon,
  Settings02Icon,
  Quiz02Icon,
  Agreement02Icon,
} from "@hugeicons/core-free-icons";

import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-api";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: "700",
});

const navMainData = [
  {
    title: "Overview",
    url: "/",
    icon: Home01Icon,
  },
  {
    title: "Manage Jobs",
    url: "/jobs",
    icon: Briefcase01Icon,
  },
  {
    title: "Candidates",
    url: "/candidates",
    icon: UserGroupIcon,
  },
  {
    title: "Assessments",
    url: "/assessments",
    icon: Quiz02Icon,
  },
  {
    title: "Manage Offers",
    url: "/offers",
    icon: Agreement02Icon,
  },
  {
    title: "Active Logs",
    url: "/active-logs",
    icon: SearchList02Icon,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings02Icon,
    items: [
      {
        title: "General",
        url: "/settings/general",
      },
      {
        title: "Theme",
        url: "/settings/theme",
      },
      {
        title: "Careers Page",
        url: "/settings/careers",
      },
      {
        title: "Templates",
        url: "/settings/templates",
      },
      {
        title: "User Management",
        url: "/settings/user-management",
      },
      {
        title: "Profile",
        url: "/settings/profile",
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: meData } = useCurrentUser();
  const role = meData?.data.role;

  const settingsItems = navMainData.find((item) => item.url === "/settings")?.items ?? [];
  const visibleSettingsItems = settingsItems.filter((item) => {
    if (!role) return true;
    if (role === "interviewer") {
      return ![
        "/settings/careers",
        "/settings/templates",
        "/settings/user-management",
      ].includes(item.url);
    }
    if (role === "hiring_manager") {
      return item.url !== "/settings/careers";
    }
    return true;
  });

  const items = navMainData.map((item) => ({
    ...item,
    ...(item.url === "/settings" ? { items: visibleSettingsItems } : {}),
    isActive:
      item.url === "/"
        ? pathname === "/"
        : pathname === item.url || pathname.startsWith(item.url + "/"),
  }));

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader className="h-16 shrink-0 px-6">
        <div className="flex h-full w-full items-center justify-start">
          <span
            className={`${publicSans.className} font-bold text-[2rem] leading-none tracking-tight text-black dark:text-white select-none`}
          >
            OpenATS
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
    </Sidebar>
  );
}
