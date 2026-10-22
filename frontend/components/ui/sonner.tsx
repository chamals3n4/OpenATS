"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, Alert02Icon, MultiplicationSignCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
        ),
        info: (
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />
        ),
        warning: (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
        ),
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-4" />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--width": "320px",
        } as React.CSSProperties
      }
      toastOptions={{
        duration: 2500,
        // A solid colour for each kind, so the state reads at a glance
        classNames: {
          toast: "cn-toast group/toast !rounded-full !px-4 !py-2.5 !text-sm !shadow-md",
          title: "!font-medium",
          success: "!border-emerald-700 !bg-emerald-600 !text-white",
          error: "!border-red-700 !bg-red-600 !text-white",
          warning: "!border-amber-600 !bg-amber-500 !text-white",
          info: "!border-sky-700 !bg-sky-600 !text-white",
          // Title only: a toast is a short confirmation, details belong on the page
          description: "!hidden",
          // Written out in full so Tailwind finds every class
          actionButton:
            "group-data-[type=success]/toast:!bg-white/20 group-data-[type=error]/toast:!bg-white/20 group-data-[type=warning]/toast:!bg-white/20 group-data-[type=info]/toast:!bg-white/20 group-data-[type=success]/toast:!text-white group-data-[type=error]/toast:!text-white group-data-[type=warning]/toast:!text-white group-data-[type=info]/toast:!text-white",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
