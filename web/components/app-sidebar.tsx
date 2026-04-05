"use client";

import * as React from "react";
import { Changa_One } from "next/font/google";
import {
  Home01Icon,
  Briefcase01Icon,
  UserGroupIcon,
  SearchList02Icon,
  CheckListIcon,
  Message01Icon,
  Settings02Icon,
  Quiz02Icon,
  Agreement02Icon,
} from "@hugeicons/core-free-icons";

import { usePathname } from "next/navigation";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const changaOne = Changa_One({
  subsets: ["latin"],
  weight: "400",
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
      {
        title: "Archive",
        url: "/settings/archive",
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
      <SidebarHeader className="h-16 justify-center px-6">
        <div className="flex items-center justify-start w-full">
          <span
            className={`${changaOne.className} font-normal text-[2.5rem] leading-none tracking-normal text-black dark:text-white select-none`}
          >
            OpenATS
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
