"use client";

import {
  forwardRef,
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  CSSProperties,
  type Ref,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ThemeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  asChild?: false;
}

interface ThemeLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: "primary" | "outline";
  asChild: true;
  href: string;
}

type Props = ThemeButtonProps | ThemeLinkProps;

const baseClasses =
  "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

function getStyle(
  variant: "primary" | "outline",
  extra?: CSSProperties,
): CSSProperties {
  return variant === "primary"
    ? { backgroundColor: "var(--theme-color)", ...extra }
    : {
        borderColor: "var(--theme-color)",
        color: "var(--theme-color)",
        ...extra,
      };
}

function onEnter(variant: "primary" | "outline", el: HTMLElement) {
  if (variant === "primary") {
    el.style.backgroundColor = "var(--theme-color-hover)";
  } else {
    el.style.backgroundColor = "var(--theme-color)";
    el.style.color = "white";
  }
}

function onLeave(variant: "primary" | "outline", el: HTMLElement) {
  if (variant === "primary") {
    el.style.backgroundColor = "var(--theme-color)";
  } else {
    el.style.backgroundColor = "transparent";
    el.style.color = "var(--theme-color)";
  }
}

export const ThemeButton = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  Props
>(({ className, variant = "primary", children, ...props }, ref) => {
  const variantClasses =
    variant === "primary" ? "text-white shadow-sm" : "border-2 bg-transparent";

  if ("asChild" in props && props.asChild) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { asChild: _asChild, href, style, ...rest } = props as ThemeLinkProps;
    return (
      <Link
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        className={cn(baseClasses, variantClasses, className)}
        style={getStyle(variant, style as CSSProperties)}
        onMouseEnter={(e) => onEnter(variant, e.currentTarget)}
        onMouseLeave={(e) => onLeave(variant, e.currentTarget)}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  const { style, ...rest } = props as ThemeButtonProps;
  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      className={cn(baseClasses, variantClasses, className)}
      style={getStyle(variant, style)}
      onMouseEnter={(e) => onEnter(variant, e.currentTarget)}
      onMouseLeave={(e) => onLeave(variant, e.currentTarget)}
      {...rest}
    >
      {children}
    </button>
  );
});

ThemeButton.displayName = "ThemeButton";
