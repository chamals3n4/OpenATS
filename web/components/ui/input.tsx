import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  render,
  ...props
}: InputPrimitive.Props) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      render={
        render ?? (
          <motion.input
            whileTap={{ scale: 0.9997 }}
            transition={{ duration: 0.34, ease: "easeInOut" }}
          />
        )
      }
      className={cn(
        "dark:bg-input/30 border-input focus-visible:border-ring aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow,border-color] duration-200 ease-in-out file:h-7 file:text-sm file:font-medium md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
