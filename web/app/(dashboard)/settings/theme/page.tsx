"use client";

import { useState, useEffect } from "react";

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
    document.documentElement.style.setProperty("--sidebar-primary", color);
    document.documentElement.style.setProperty("--sidebar-accent", color);
    document.documentElement.style.setProperty("--sidebar-ring", color);
    document.documentElement.style.setProperty("--theme-color", color);

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    document.documentElement.style.setProperty(
      "--sidebar-hover",
      `rgba(${r}, ${g}, ${b}, 0.1)`,
    );
    document.documentElement.style.setProperty(
      "--theme-color-hover",
      `rgba(${r}, ${g}, ${b}, 0.9)`,
    );

    const oklch = hexToOKLCH(color);
    document.documentElement.style.setProperty("--primary", oklch);
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
    <div className="flex flex-1 flex-col bg-white">
      {/* Page header */}
      <div className="px-8 py-6 border-b border-slate-100">
        <h1 className="text-[22px] font-semibold text-slate-900 leading-none">
          Theme
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Choose an accent color for buttons, sidebar highlights, and focus
          states.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex px-8 py-8 min-h-full">
          {/* ── Left: Controls ── */}
          <div className="w-120 shrink-0 space-y-10 pr-12">
            {/* Section: Presets */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                Presets
              </p>
              <div className="flex flex-wrap gap-3">
                {PRESET_COLORS.map((preset) => {
                  const isSelected =
                    themeColor.toLowerCase() === preset.value.toLowerCase();
                  return (
                    <button
                      key={preset.value}
                      title={preset.name}
                      onClick={() => handleColorChange(preset.value)}
                      className="group flex flex-col items-center gap-1.5 focus:outline-none"
                    >
                      <div
                        className="w-9 h-9 rounded-full transition-all duration-150"
                        style={{
                          backgroundColor: preset.value,
                          boxShadow: isSelected
                            ? `0 0 0 2px white, 0 0 0 4px ${preset.value}`
                            : "none",
                          transform: isSelected ? "scale(1.1)" : "scale(1)",
                        }}
                      />
                      <span className="text-[11px] text-slate-500 group-hover:text-slate-700 transition-colors">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Section: Custom color */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                Custom Color
              </p>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="colorPicker"
                  className="relative w-10 h-10 rounded-lg cursor-pointer overflow-hidden border border-slate-200 shadow-sm shrink-0"
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
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) handleColorChange(val);
                  }}
                  className="h-10 w-36 bg-white border border-slate-200 rounded-lg px-3 text-sm font-mono text-slate-700 focus:outline-none focus:border-slate-400 transition-colors"
                  placeholder="#000000"
                  maxLength={7}
                  spellCheck={false}
                />
                <span className="text-xs text-slate-400">Hex value</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Footer actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-slate-800 transition-colors underline-offset-2 hover:underline"
              >
                Reset to default
              </button>
              <div className="flex items-center gap-3">
                {themeColor !== savedColor && !justSaved && (
                  <span className="text-xs text-amber-500">
                    Unsaved changes
                  </span>
                )}
                {justSaved && (
                  <span className="text-xs text-green-600">Saved!</span>
                )}
                <button
                  onClick={handleSave}
                  disabled={themeColor === savedColor}
                  className="h-9 px-5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "var(--theme-color)" }}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="w-px bg-slate-100 shrink-0 self-stretch" />

          {/* ── Right: Live preview panel ── */}
          <div className="flex-1 pl-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Preview
            </p>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              {/* Mock top bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded"
                    style={{ backgroundColor: themeColor }}
                  />
                  <span className="text-[13px] font-semibold text-slate-700">
                    OpenATS
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-200" />
              </div>

              {/* Mock body */}
              <div className="flex" style={{ minHeight: 300 }}>
                {/* Mock sidebar */}
                <div className="w-28 shrink-0 border-r border-slate-100 bg-slate-50 p-3 space-y-1">
                  {["Dashboard", "Jobs", "Candidates", "Assessments"].map(
                    (item, i) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                        style={
                          i === 1
                            ? { backgroundColor: themeColor, color: "white" }
                            : { color: "#64748b" }
                        }
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{
                            backgroundColor:
                              i === 1 ? "rgba(255,255,255,0.6)" : "#cbd5e1",
                          }}
                        />
                        {item}
                      </div>
                    ),
                  )}
                </div>

                {/* Mock content */}
                <div className="flex-1 p-4 space-y-4 bg-white">
                  {/* Mock page title row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-3 w-14 rounded bg-slate-800 mb-1.5" />
                      <div className="h-2 w-16 rounded bg-slate-200" />
                    </div>
                    <button
                      className="h-7 px-3 rounded-md text-white text-[11px] font-medium"
                      style={{ backgroundColor: themeColor }}
                    >
                      + New Job
                    </button>
                  </div>

                  {/* Mock input with focus ring */}
                  <div
                    className="h-8 w-full rounded-md border-2 bg-white px-2.5 flex items-center gap-2"
                    style={{ borderColor: themeColor }}
                  >
                    <div className="w-3 h-3 rounded-full border border-slate-300" />
                    <div className="h-2 w-14 rounded bg-slate-200" />
                  </div>

                  {/* Mock table rows */}
                  <div className="space-y-1.5">
                    {[
                      ["Senior Engineer", "Engineering"],
                      ["Product Designer", "Design"],
                      ["Data Analyst", "Analytics"],
                    ].map(([title, dept]) => (
                      <div
                        key={title}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 border border-slate-100"
                      >
                        <div>
                          <div className="h-2.5 w-16 rounded bg-slate-700 mb-1" />
                          <div className="h-2 w-10 rounded bg-slate-300" />
                        </div>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${themeColor}18`,
                            color: themeColor,
                          }}
                        >
                          {dept}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Mock button row */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      className="h-7 px-3 rounded-md text-white text-[11px] font-medium"
                      style={{ backgroundColor: themeColor }}
                    >
                      Save
                    </button>
                    <button
                      className="h-7 px-3 rounded-md text-[11px] font-medium border bg-white"
                      style={{ borderColor: themeColor, color: themeColor }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
