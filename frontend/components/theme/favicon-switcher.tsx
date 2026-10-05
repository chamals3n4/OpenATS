"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Points the tab icon at the white mark in dark mode and the black mark in
 * light mode. A `media` query on the icon link only follows the OS theme, so
 * it would be wrong whenever the user picks a theme in the app that differs
 * from their system setting.
 */
export function FaviconSwitcher() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const href = resolvedTheme === "dark" ? "/icon-dark.png" : "/icon-light.png";
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((link) => {
      link.href = href;
      link.type = "image/png";
      link.removeAttribute("sizes");
    });
  }, [resolvedTheme]);

  return null;
}
