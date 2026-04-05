import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const inputInteraction =
  "motion-reduce:transition-none " +
  "transition-[border-color_380ms_cubic-bezier(0.4,0,0.2,1),box-shadow_380ms_cubic-bezier(0.4,0,0.2,1),color_200ms_ease-in-out,background-color_200ms_ease-in-out,opacity_200ms_ease-in-out]";

function Input({ className, type, render, ...props }: InputPrimitive.Props) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      render={
        render ?? (
          <motion.input
            whileTap={{ scale: 0.9997 }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
          />
        )
      }
      className={cn(
        "dark:bg-input/30 border-input h-9 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs md:text-sm file:h-7 file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        inputInteraction,
        "focus-visible:border-ring focus-visible:ring-0 focus-visible:ring-offset-0",
        "aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 aria-invalid:ring-0",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
