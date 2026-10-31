"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

/** Where a click would take the person, if it leaves this page in this tab */
export function leavingHref(event: MouseEvent): string | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  if (!(event.target instanceof Element)) return null;

  const link = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) {
    return null;
  }

  const url = new URL(link.href);
  const { origin, pathname, search } = window.location;
  if (url.origin !== origin) return null;
  if (url.pathname === pathname && url.search === search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Asks before leaving a form with unsaved changes, by link or by closing the tab.
 * Next.js has no way to stop the browser's back button, so that is not covered.
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    // Capture, so this runs before the link's own handler
    const handleClick = (event: MouseEvent) => {
      const href = leavingHref(event);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      setTarget(href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [when]);

  return (
    <ConfirmDeleteDialog
      open={target !== null}
      title="Leave without saving?"
      description="Your changes on this page have not been saved."
      confirmLabel="Leave"
      onClose={() => setTarget(null)}
      onConfirm={() => {
        if (target) router.push(target);
        setTarget(null);
      }}
    />
  );
}
