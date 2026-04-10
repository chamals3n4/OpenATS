import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "border-input focus-visible:border-ring aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 rounded-md border bg-white px-2.5 py-1 text-base text-slate-900 shadow-xs transition-[color,box-shadow,border-color] duration-200 ease-in-out placeholder:text-slate-500 file:h-7 file:text-sm file:font-medium md:text-sm file:text-foreground dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-400 file:inline-flex file:border-0 file:bg-transparent w-full min-w-0 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
