"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonPress =
  "motion-reduce:transition-none motion-reduce:active:scale-100 " +
  "transition-[transform_380ms_cubic-bezier(0.4,0,0.2,1),background-color_200ms_ease-in-out,border-color_200ms_ease-in-out,color_200ms_ease-in-out,box-shadow_200ms_ease-in-out,opacity_200ms_ease-in-out] " +
  "active:scale-[0.985]";

const buttonVariants = cva(
  "focus-visible:border-ring aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-md border border-transparent bg-clip-padding text-[14px] font-semibold leading-none inline-flex items-center justify-center whitespace-nowrap cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color-hover)]",
        outline:
          "border-transparent bg-neutral-700 text-white hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 aria-expanded:bg-neutral-600 aria-expanded:text-white shadow-none",
        secondary:
          "bg-neutral-700 text-white hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 aria-expanded:bg-neutral-600 aria-expanded:text-white",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 focus-visible:border-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-[34px] gap-2 px-4 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 [&_svg:not([class*='size-'])]:size-4",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[34px] gap-2 rounded-md px-4 text-[14px] in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-[34px]",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-[34px] rounded-md in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }), buttonPress)}
      render={render}
      {...props}
    />
  );
}

export { Button, buttonVariants };
