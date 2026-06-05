"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { buttonPress } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: any;
  isActive?: boolean;
  items?: { title: string; url: string }[];
};

function NavCollapsibleSection({
  item,
}: {
  item: NavItem & { items: { title: string; url: string }[] };
}) {
  const [open, setOpen] = React.useState(() => Boolean(item.isActive));

  React.useEffect(() => {
    if (item.isActive) {
      setOpen(true);
    }
  }, [item.isActive]);

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => setOpen(next)}
      className="group/collapsible w-full"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              isActive={item.isActive}
              className={`w-full cursor-pointer ${buttonPress}`}
            >
              <HugeiconsIcon icon={item.icon} className="size-4 shrink-0" />
              <span className="flex-1">{item.title}</span>
              <ChevronRight className="size-3.5 shrink-0 text-sidebar-foreground/50 transition-transform duration-200 group-data-open/collapsible:-rotate-90" />
            </SidebarMenuButton>
          }
        />

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  className={buttonPress}
                  render={<Link href={subItem.url} />}
                >
                  <span>{subItem.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) =>
          item.items?.length ? (
            <NavCollapsibleSection
              key={item.title}
              item={{ ...item, items: item.items }}
            />
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={item.isActive}
                className={buttonPress}
                render={<Link href={item.url} />}
              >
                <HugeiconsIcon icon={item.icon} className="size-4 shrink-0" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
