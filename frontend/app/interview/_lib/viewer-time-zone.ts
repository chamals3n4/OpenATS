"use client";

import { useSyncExternalStore } from "react";

const neverChanges = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const noZoneOnServer = () => null;

/**
 * The time zone of the person looking at the page, or null while it is rendered on the server.
 * This page is rendered on the server first, where the zone is the server's (often UTC), so
 * times must not be written until this is known.
 */
export function useViewerTimeZone(): string | null {
  return useSyncExternalStore(neverChanges, browserZone, noZoneOnServer);
}

/** e.g. "Asia/Colombo (GMT+5:30)": the zone's name and its offset on the given day. */
export function zoneLabel(timeZone: string, at: Date = new Date()): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value;
    const name = timeZone.replace(/_/g, " ");
    return offset && offset !== name ? `${name} (${offset})` : name;
  } catch {
    return timeZone;
  }
}
