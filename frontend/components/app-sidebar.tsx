"use client";

import * as React from "react";
import { Public_Sans } from "next/font/google";
import {
  Home01Icon,
  Briefcase01Icon,
  UserGroupIcon,
  SearchList02Icon,
  Settings02Icon,
  ArtboardToolIcon,
  Quiz02Icon,
  Agreement02Icon,
  Calendar02Icon,
} from "@hugeicons/core-free-icons";

import { usePathname } from "next/navigation";

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
    title: "Interviews",
    url: "/interviews",
    icon: Calendar02Icon,
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
    title: "Templates",
    url: "/templates",
    icon: ArtboardToolIcon,
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
        title: "Profile",
        url: "/settings/profile",
      },
      {
        title: "Careers Page",
        url: "/settings/careers-page",
      },
      {
        title: "User Management",
        url: "/settings/user-management",
      },
      {
        title: "Theme",
        url: "/settings/theme",
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const items = navMainData.map((item) => ({
    ...item,
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
