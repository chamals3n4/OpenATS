"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon, Moon01Icon, ComputerIcon } from "@hugeicons/core-free-icons";

const PRESET_COLORS = [
  { name: "Terracotta", value: "#D97757" },
  { name: "Teal Blue", value: "#355872" },
  { name: "Purple", value: "#7C3AED" },
  { name: "Green", value: "#10B981" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Orange", value: "#FF7300" },
  { name: "Pink", value: "#EC4899" },
  { name: "Indigo", value: "#6366F1" },
];

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [themeColor, setThemeColor] = useState("#D97757");
  const [savedColor, setSavedColor] = useState("#D97757");
  const [justSaved, setJustSaved] = useState(false);

  const hexToOKLCH = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const c = max - min;

    let h = 0;
    if (c !== 0) {
      if (max === r) h = ((g - b) / c + 6) % 6;
      else if (max === g) h = (b - r) / c + 2;
      else h = (r - g) / c + 4;
      h *= 60;
    }

    return `oklch(${(l * 0.8 + 0.1).toFixed(2)} ${(c * 0.2).toFixed(2)} ${h.toFixed(0)})`;
  };

  const applyThemeColor = (color: string) => {
    const root = document.documentElement;
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--sidebar-accent");
    root.style.removeProperty("--sidebar-accent-foreground");
    root.style.removeProperty("--sidebar-ring");
    root.style.removeProperty("--sidebar-hover");
    root.style.setProperty("--theme-color", color);

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    root.style.setProperty(
      "--theme-color-hover",
      `rgba(${r}, ${g}, ${b}, 0.9)`,
    );

    const oklch = hexToOKLCH(color);
    root.style.setProperty("--primary", oklch);
  };

  useEffect(() => {
    const stored = localStorage.getItem("themeColor");
    if (stored) {
      setThemeColor(stored);
      setSavedColor(stored);
      applyThemeColor(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleColorChange = (color: string) => {
    setThemeColor(color);
    applyThemeColor(color);
  };

  const handleSave = () => {
    localStorage.setItem("themeColor", themeColor);
    setSavedColor(themeColor);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleReset = () => {
    const defaultColor = "#D97757";
    handleColorChange(defaultColor);
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      {/* Page header */}
      <div className="px-8 py-6 border-b border-slate-100 dark:border-neutral-800">
        <h1 className="text-[22px] font-semibold text-slate-900 dark:text-neutral-100 leading-none">
          Theme
        </h1>
        <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1.5">
          Choose an accent color for buttons and primary UI; the sidebar stays
          neutral in light and dark mode.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-8 py-12 space-y-12">
          {/* Section: Appearance */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-neutral-500 mb-6">
              Appearance
            </p>
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                Color mode
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: "light", label: "Light", icon: Sun01Icon },
                  { id: "system", label: "Auto", icon: ComputerIcon },
                  { id: "dark", label: "Dark", icon: Moon01Icon },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setTheme(mode.id)}
                    className={cn(
                      "group relative flex flex-col items-center gap-3 focus:outline-none"
                    )}
                  >
                    <div
                      className={cn(
                        "relative w-full aspect-[4/3] rounded-xl border-2 transition-all flex items-center justify-center bg-slate-50 dark:bg-neutral-900 overflow-hidden",
                        theme === mode.id
                          ? "border-blue-500 ring-1 ring-blue-500 shadow-sm"
                          : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                      )}
                    >
                      <HugeiconsIcon
                        icon={mode.icon}
                        className={cn(
                          "size-8 transition-colors duration-200",
                          theme === mode.id
                            ? "text-blue-500"
                            : "text-slate-400 dark:text-neutral-500"
                        )}
                        strokeWidth={1.5}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors",
                        theme === mode.id
                          ? "text-slate-900 dark:text-neutral-100"
                          : "text-slate-500 dark:text-neutral-400"
                      )}
                    >
                      {mode.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-neutral-800" />

          {/* Section: Presets */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-neutral-500 mb-6">
              Presets
            </p>
            <div className="flex flex-wrap gap-4">
              {PRESET_COLORS.map((preset) => {
                const isSelected =
                  themeColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    title={preset.name}
                    onClick={() => handleColorChange(preset.value)}
                    className="group flex flex-col items-center gap-2 focus:outline-none"
                  >
                    <div
                      className="w-10 h-10 rounded-full transition-all duration-200 shadow-sm"
                      style={{
                        backgroundColor: preset.value,
                        boxShadow: isSelected
                          ? `0 0 0 2px var(--background), 0 0 0 4px ${preset.value}`
                          : "none",
                        transform: isSelected ? "scale(1.1)" : "scale(1)",
                      }}
                    />
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold tracking-tight transition-colors",
                        isSelected
                          ? "text-slate-900 dark:text-neutral-100"
                          : "text-slate-400 group-hover:text-slate-600"
                      )}
                    >
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-neutral-800" />

          {/* Section: Custom color */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-neutral-500 mb-6">
              Custom Color
            </p>
            <div className="flex items-center gap-4">
              <label
                htmlFor="colorPicker"
                className="relative w-12 h-12 rounded-xl cursor-pointer overflow-hidden border border-slate-200 dark:border-neutral-800 shadow-sm shrink-0 transition-transform hover:scale-105"
                style={{ backgroundColor: themeColor }}
              >
                <input
                  id="colorPicker"
                  type="color"
                  value={themeColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </label>
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) handleColorChange(val);
                  }}
                  className="h-10 w-36 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg px-3 text-sm font-mono text-slate-700 dark:text-neutral-300 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="#000000"
                  maxLength={7}
                  spellCheck={false}
                />
                <span className="text-[10px] font-semibold text-slate-400 uppercase ml-1">
                  Hex value
                </span>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-neutral-800" />

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={handleReset}
              className="text-sm font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 transition-colors"
            >
              Reset to default
            </button>
            <div className="flex items-center gap-4">
              {themeColor !== savedColor && !justSaved && (
                <span className="text-xs font-medium text-amber-500 animate-pulse">
                  Unsaved changes
                </span>
              )}
              {justSaved && (
                <span className="text-xs font-medium text-green-600">
                  Settings saved!
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={themeColor === savedColor}
                className="h-10 px-6 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm"
                style={{ backgroundColor: "var(--theme-color)" }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
