"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  Clock01Icon,
  Notification03Icon,
  Quiz03Icon,
  MailRemove01Icon,
  TaskDone01Icon,
  TelegramIcon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/queries/use-notifications";
import { describeNotification, type NotificationKind } from "@/lib/notifications";
import { timeAgo } from "@/lib/format";

const ICONS: Record<NotificationKind, typeof Notification03Icon> = {
  application: UserAdd01Icon,
  interview: Calendar03Icon,
  assessment: Quiz03Icon,
  assignment: TaskDone01Icon,
  offer: TelegramIcon,
  waiting: Clock01Icon,
  email: MailRemove01Icon,
};

/** How many are listed before "Show more" is pressed. */
const FIRST_SHOWN = 4;

/** Notifications bell and list */
export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const items = useMemo(
    () =>
      (data?.data ?? []).map((n) => ({
        id: n.id,
        ...describeNotification(n),
        when: timeAgo(n.createdAt),
        unread: !n.readAt,
      })),
    [data],
  );
  const unreadCount = data?.meta.unread ?? 0;
  const matching = onlyUnread ? items.filter((item) => item.unread) : items;
  const shown = expanded ? matching : matching.slice(0, FIRST_SHOWN);
  const hiddenCount = matching.length - shown.length;

  const markAllRead = () => markRead.mutate(undefined);

  // Stop the wheel from scrolling the page
  const keepWheelInside = useCallback((popup: HTMLDivElement | null) => {
    if (!popup) return;
    const onWheel = (event: WheelEvent) => {
      const list = popup.querySelector<HTMLElement>("[data-notification-list]");
      const overList = list?.contains(event.target as Node) ?? false;
      const canScroll =
        list !== null &&
        overList &&
        (event.deltaY < 0
          ? list.scrollTop > 0
          : list.scrollTop + list.clientHeight < list.scrollHeight - 1);
      if (!canScroll) event.preventDefault();
    };
    // Not passive, or preventDefault would be ignored.
    popup.addEventListener("wheel", onWheel, { passive: false });
    return () => popup.removeEventListener("wheel", onWheel);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Opens short again next time, on the newest few.
    if (!next) setExpanded(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100/80 text-slate-500 outline-none hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-theme/40 aria-expanded:bg-slate-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:aria-expanded:bg-neutral-800"
      >
        <HugeiconsIcon icon={Notification03Icon} className="size-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-theme ring-2 ring-white dark:ring-neutral-950"
          />
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label="Notifications"
        className="w-[min(400px,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-md border border-slate-300 p-0 shadow-lg ring-0 dark:border-neutral-700"
      >
        <div ref={keepWheelInside} className="flex flex-col">
        <header className="border-b border-slate-300 dark:border-neutral-700">
          <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">Notifications</h2>
            <p className="text-sm text-slate-600 dark:text-neutral-400">
              {unreadCount > 0 ? `${unreadCount} unread` : "You are all caught up"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div role="tablist" aria-label="Which notifications to show" className="flex items-center gap-1">
              {[
                { label: "All", unread: false },
                { label: "Unread", unread: true },
              ].map((tab) => {
                const active = onlyUnread === tab.unread;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setOnlyUnread(tab.unread);
                      setExpanded(false);
                    }}
                    className={`h-8 cursor-pointer rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-theme/40 ${
                      active
                        ? "bg-theme/10 text-theme dark:text-primary"
                        : "text-slate-600 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="cursor-pointer text-sm font-medium text-theme hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline dark:text-primary dark:disabled:text-neutral-600"
            >
              Mark all as read
            </button>
          </div>
        </header>

        <div data-notification-list className="max-h-[min(28rem,calc(100dvh-14rem))] overflow-y-auto overscroll-contain">
          {shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-600 dark:text-neutral-400">
              {onlyUnread ? "Nothing unread." : "Nothing yet."} New activity on your jobs will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
              {shown.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (item.unread) markRead.mutate([item.id]);
                      handleOpenChange(false);
                    }}
                    className="flex items-start gap-3 px-4 py-3 outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 dark:hover:bg-neutral-800/60 dark:focus-visible:bg-neutral-800/60"
                  >
                    <HugeiconsIcon
                      icon={ICONS[item.kind]}
                      strokeWidth={1.75}
                      aria-hidden
                      className={`mt-0.5 size-5 shrink-0 ${
                        item.unread ? "text-theme dark:text-primary" : "text-slate-400 dark:text-neutral-500"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span
                          className={`truncate text-sm ${
                            item.unread
                              ? "font-semibold text-slate-900 dark:text-neutral-100"
                              : "font-medium text-slate-700 dark:text-neutral-300"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-neutral-400">
                          {item.when}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-slate-600 dark:text-neutral-400">
                        {item.detail}
                      </span>
                    </span>
                    <span
                      aria-label={item.unread ? "Unread" : undefined}
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${item.unread ? "bg-theme" : "bg-transparent"}`}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(hiddenCount > 0 || (expanded && matching.length > FIRST_SHOWN)) && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="w-full cursor-pointer border-t border-slate-300 px-4 py-2.5 text-sm font-medium text-theme outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 dark:border-neutral-700 dark:text-primary dark:hover:bg-neutral-800/60"
          >
            {expanded ? "Show less" : `Show ${hiddenCount} more`}
          </button>
        )}

        </div>
      </PopoverContent>
    </Popover>
  );
}
