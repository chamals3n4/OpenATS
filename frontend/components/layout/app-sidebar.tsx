"use client";

import * as React from "react";
import {
  Home01Icon,
  BriefcaseBusinessIcon,
  UsersRoundIcon,
  Settings02Icon,
  Layout03Icon,
  Quiz03Icon,
  TelegramIcon,
  CoPresentIcon,
} from "@hugeicons/core-free-icons";

import { usePathname } from "next/navigation";

import { NavMain } from "@/components/layout/nav-main";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { useRole } from "@/hooks/use-role";

const navMainData = [
  {
    title: "Overview",
    url: "/",
    icon: Home01Icon,
  },
  {
    title: "Manage Jobs",
    url: "/jobs",
    icon: BriefcaseBusinessIcon,
  },
  {
    title: "Candidates",
    url: "/candidates",
    icon: UsersRoundIcon,
  },
  {
    title: "Interviews",
    url: "/interviews",
    icon: CoPresentIcon,
  },
  {
    title: "Assessments",
    url: "/assessments",
    icon: Quiz03Icon,
  },
  {
    title: "Manage Offers",
    url: "/offers",
    icon: TelegramIcon,
  },
  {
    title: "Templates",
    url: "/templates",
    icon: Layout03Icon,
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
        title: "Integrations",
        url: "/settings/integrations",
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isSuperAdmin, isManager } = useRole();

  const items = navMainData
    .filter((item) => {
      if (item.url === "/offers") return isManager;
      return true;
    })
    .map((item) => {
      if (item.items) {
        return {
          ...item,
          items: item.items.filter((sub) => {
            if (sub.url === "/settings/user-management") return isSuperAdmin;
            if (sub.url === "/settings/careers-page") return isManager;
            return true;
          }),
        };
      }
      return item;
    })
    .map((item) => ({
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
      <SidebarContent className="pt-4">
        <NavMain items={items} />
      </SidebarContent>
    </Sidebar>
  );
}
