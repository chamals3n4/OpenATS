import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, Edit02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const base =
  "h-8 gap-2 rounded-md px-3.5 text-sm font-medium leading-none shadow-none cursor-pointer";

type RowActionProps = Omit<React.ComponentProps<typeof Button>, "children"> & {
  children?: React.ReactNode;
};

export function RowEditButton({ className, children, ...props }: RowActionProps) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        base,
        "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800",
        className,
      )}
      {...props}
    >
      <HugeiconsIcon icon={Edit02Icon} className="size-4" strokeWidth={1.75} />
      {children ?? "Edit"}
    </Button>
  );
}

export function RowDeleteButton({
  className,
  children,
  ...props
}: RowActionProps) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        base,
        "border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70",
        className,
      )}
      {...props}
    >
      <HugeiconsIcon
        icon={Delete01Icon}
        className="size-4"
        strokeWidth={1.75}
      />
      {children ?? "Delete"}
    </Button>
  );
}
