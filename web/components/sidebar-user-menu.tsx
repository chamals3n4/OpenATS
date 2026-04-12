"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAsgardeo } from "@asgardeo/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerIcon,
  Logout01Icon,
  MoreHorizontalIcon,
  Sun01Icon,
  Moon02Icon,
} from "@hugeicons/core-free-icons";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Asgardeo user fields we read in this menu (see Asgardeo user / profile shape). */
type AsgardeoUserMenuFields = {
  display_name?: string;
  displayName?: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  username?: string;
  userName?: string;
  email?: string;
  profilePicture?: string;
  profileUrl?: string;
};

export type SidebarUserMenuProps = {
  /** `header`: top bar — avatar only in the trigger. `sidebar`: rail next to logo (name + menu when expanded). */
  variant?: "header" | "sidebar";
};

export function SidebarUserMenu({ variant = "header" }: SidebarUserMenuProps) {
  const { user, signOut, isLoading } = useAsgardeo();
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = React.useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const collapsed = state === "collapsed";
  const showProfileRow = variant === "sidebar" && !collapsed;

  const u = user as AsgardeoUserMenuFields | null | undefined;
  const displayName =
    `${u?.name?.givenName ?? ""} ${u?.name?.familyName ?? ""}`.trim() ||
    u?.display_name?.trim() ||
    u?.displayName?.trim() ||
    "User";
  const email = u?.userName || u?.username || u?.email || "";
  const avatarSrc = u?.profilePicture ?? u?.profileUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          "inline-flex max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg text-left outline-none transition-colors",
          variant === "header"
            ? "rounded-full p-0.5 hover:bg-slate-100/90 dark:hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:focus-visible:ring-neutral-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            : "px-1.5 py-1.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <Avatar
          className={cn(
            "size-9 shrink-0 border",
            variant === "header"
              ? "border-slate-200 dark:border-neutral-700"
              : "border-sidebar-border",
          )}
        >
          {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              variant === "header"
                ? "bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-neutral-100"
                : "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            {initialsFromName(displayName)}
          </AvatarFallback>
        </Avatar>
        {showProfileRow && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {isLoading ? "…" : displayName}
              </p>
            </div>
            <HugeiconsIcon
              icon={MoreHorizontalIcon}
              className="size-4 shrink-0 text-sidebar-foreground/70"
              strokeWidth={2}
            />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 rounded-xl border border-border bg-popover p-0 shadow-lg"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <Link
          href="/settings/profile"
          className="block cursor-pointer border-b border-border px-3 py-3 transition-colors hover:bg-accent/40"
        >
          <p className="truncate text-[15px] font-semibold leading-snug text-popover-foreground">
            {isLoading ? "Loading…" : displayName}
          </p>
          {email ? (
            <p className="mt-1 truncate text-xs font-normal leading-5 text-muted-foreground">
              {email}
            </p>
          ) : null}
        </Link>

        <div
          className="flex min-h-10 items-center justify-between gap-2 border-b border-border px-3 py-2.5"
          onPointerDown={(e) => e.preventDefault()}
        >
          <span className="text-sm text-popover-foreground">Theme</span>
          {mounted ? (
            <div className="flex h-8 shrink-0 items-center rounded-full border border-border bg-muted/60 p-0.5 dark:bg-muted/40">
              {(
                [
                  { id: "system", icon: ComputerIcon, label: "System" },
                  { id: "light", icon: Sun01Icon, label: "Light" },
                  { id: "dark", icon: Moon02Icon, label: "Dark" },
                ] as const
              ).map((mode) => {
                const active = theme === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    title={mode.label}
                    aria-label={mode.label}
                    aria-pressed={active}
                    onClick={() => setTheme(mode.id)}
                    className={cn(
                      "flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <HugeiconsIcon
                      icon={mode.icon}
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-8 w-[88px] shrink-0 rounded-full bg-muted/50" />
          )}
        </div>

        <div className="p-1">
          <DropdownMenuItem
            variant="destructive"
            className="min-h-10 cursor-pointer justify-between gap-3 rounded-md px-2 py-2"
            onClick={() => setConfirmLogoutOpen(true)}
          >
            <span>Log out</span>
            <HugeiconsIcon
              icon={Logout01Icon}
              className="size-4 opacity-80"
              strokeWidth={2}
            />
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
      <AlertDialog open={confirmLogoutOpen} onOpenChange={setConfirmLogoutOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your current session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                queryClient.invalidateQueries();
                router.push("/login");
                void signOut();
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
