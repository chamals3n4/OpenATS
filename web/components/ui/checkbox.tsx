"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"

export type CheckboxProps = CheckboxPrimitive.Root.Props & {
  /** `theme` uses brand terracotta; tick is white in light mode and `background` in dark. */
  variant?: "default" | "theme"
}

function Checkbox({
  className,
  variant = "default",
  ...props
}: CheckboxProps) {
  const checkedStyles =
    variant === "theme"
      ? "data-checked:bg-theme data-checked:border-theme dark:data-checked:bg-theme dark:data-checked:border-theme data-checked:text-white dark:data-checked:text-background aria-invalid:aria-checked:border-theme"
      : "data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary"

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "border-input dark:bg-input/30 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex size-5 items-center justify-center rounded-[5px] border shadow-xs transition-shadow group-has-disabled/field:opacity-50 focus-visible:ring-3 aria-invalid:ring-3 peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
        checkedStyles,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="[&>svg]:size-4 grid place-content-center text-current transition-none"
      >
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.25 }}
          className="grid place-content-center"
        >
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={2}
            className="size-3.5 shrink-0 text-current"
          />
        </motion.span>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
