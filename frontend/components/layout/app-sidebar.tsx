"use client";

import * as React from "react";
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

import { NavMain } from "@/components/layout/nav-main";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/queries/use-user";

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
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: currentUserRes } = useCurrentUser();
  const role = currentUserRes?.data?.role;
  const isSuperAdmin = role === "super_admin";
  const isManager = role === "super_admin" || role === "hiring_manager";

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
