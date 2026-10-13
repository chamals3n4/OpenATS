"use client";

import { useEffect } from "react";
import { SearchSelect, type SearchSelectOption } from "@/components/form/search-select";

/** "America/New_York" reads better with its underscores as spaces: "America/New York". */
const readable = (zone: string) => zone.replace(/_/g, " ");

/** The zone's offset now, such as "GMT+5:30". Empty if the browser cannot say. */
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

// Working out the offset of several hundred zones takes long enough to feel when it happens on
// the click that opens the list. It is done once for the page, ahead of that click.
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

/** The button only shows the chosen zone, so that one is worked out without building the list. */
const describeZone = (zone: string) => ({ label: readable(zone), hint: offsetOf(zone) });

/**
 * Picks a time zone from the few hundred there are, by typing part of its name: a city
 * ("colombo"), a region ("asia") or an offset ("+5:30").
 */
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
  // Get the list ready while the browser is idle, so opening it has nothing left to wait for.
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
