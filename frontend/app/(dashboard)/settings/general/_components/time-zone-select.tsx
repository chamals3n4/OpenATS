"use client";

import { useEffect } from "react";
import { SearchSelect, type SearchSelectOption } from "@/components/form/search-select";

/** Show underscores as spaces */
const readable = (zone: string) => zone.replace(/_/g, " ");

/** e.g. "GMT+5:30" */
function offsetOf(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(
      new Date(),
    );
    return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

// Build the offsets once for the page
let zoneCache: SearchSelectOption[] | null = null;
function timeZones(): SearchSelectOption[] {
  if (zoneCache) return zoneCache;
  let names: string[] = [];
  try {
    names = Intl.supportedValuesOf("timeZone");
  } catch {
    names = [];
  }
  zoneCache = Array.from(new Set(["UTC", ...names])).map((zone) => ({
    value: zone,
    label: readable(zone),
    hint: offsetOf(zone),
  }));
  return zoneCache;
}

/** Label for the selected zone */
const describeZone = (zone: string) => ({ label: readable(zone), hint: offsetOf(zone) });

/** Time zone picker. Search by city, region or offset */
export function TimeZoneSelect({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (zone: string) => void;
  className?: string;
}) {
  // Build the list when the browser is idle
  useEffect(() => {
    if (zoneCache) return;
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => timeZones());
    return () => cancel(handle);
  }, []);

  return (
    <SearchSelect
      id={id}
      value={value}
      onChange={onChange}
      options={timeZones}
      describe={describeZone}
      searchPlaceholder="Search by city, region or offset"
      emptyText="No time zone matches that."
      className={className}
    />
  );
}
