"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--sidebar-accent");
    root.style.removeProperty("--sidebar-accent-foreground");
    root.style.removeProperty("--sidebar-ring");
    root.style.removeProperty("--sidebar-hover");
    root.style.removeProperty("--theme-color");
    root.style.removeProperty("--theme-color-hover");
    root.style.removeProperty("--primary");
    localStorage.removeItem("themeColor");
  }, []);

  return null;
}
