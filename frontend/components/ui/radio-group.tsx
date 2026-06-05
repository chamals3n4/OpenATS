"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-3 w-full", className)}
      {...props}
    />
  )
}

export type RadioGroupItemProps = RadioPrimitive.Root.Props & {
  /** `theme` fills the ring with brand terracotta; dot is white in light mode and `background` in dark. */
  variant?: "default" | "theme"
}

function RadioGroupItem({
  className,
  variant = "default",
  ...props
}: RadioGroupItemProps) {
  const checkedStyles =
    variant === "theme"
      ? "data-checked:bg-theme data-checked:border-theme dark:data-checked:bg-theme dark:data-checked:border-theme aria-invalid:aria-checked:border-theme"
      : "data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary"

  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "border-input dark:bg-input/30 aria-invalid:border-destructive focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:aria-invalid:border-destructive/50 flex size-5 rounded-full focus-visible:ring-3 aria-invalid:ring-3 group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
        checkedStyles,
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-5 items-center justify-center"
      >
        <span
          className={cn(
            "absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
            variant === "theme"
              ? "bg-white dark:bg-background"
              : "bg-primary-foreground",
          )}
        />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
