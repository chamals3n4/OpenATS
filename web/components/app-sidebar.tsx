"use client";

import * as React from "react";
import Image from "next/image";
import {
  Home01Icon,
  Briefcase01Icon,
  UserGroupIcon,
  CheckListIcon,
  Message01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";

import { usePathname } from "next/navigation";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

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
    icon: CheckListIcon,
  },
  {
    title: "Manage Offers",
    url: "/offers",
    icon: Message01Icon,
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
        title: "Page Setup",
        url: "/settings/setup",
      },
      {
        title: "Templates",
        url: "/settings/templates",
      },
      {
        title: "Team",
        url: "/settings/team",
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
          <Image
            src="/logo.png"
            alt="OpenATS"
            width={200}
            height={56}
            priority
            className="object-contain"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
