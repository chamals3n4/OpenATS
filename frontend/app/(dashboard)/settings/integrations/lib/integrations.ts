import type { IntegrationStatus } from "@/hooks/queries/use-integrations";

export type IntegrationState = "connected" | "not_connected" | "coming_soon";

export type Integration = {
  /** Matches the provider the API reports on, for the ones that are wired up. */
  key: "google_meet" | "zoom" | "teams";
  name: string;
  description: string;
  logo: string;
  /** False for apps that are listed but cannot be connected yet. */
  available: boolean;
};

export const VIDEO_MEETING_INTEGRATIONS: Integration[] = [
  {
    key: "google_meet",
    name: "Google Meet",
    description: "Create a Google Meet link, and a calendar event, whenever you schedule an interview.",
    logo: "/integrations/meet.webp",
    available: true,
  },
  {
    key: "zoom",
    name: "Zoom",
    description: "Create a Zoom meeting automatically for each scheduled interview.",
    logo: "/integrations/zoom.webp",
    available: false,
  },
  {
    key: "teams",
    name: "Microsoft Teams",
    description: "Create a Teams meeting automatically for each scheduled interview.",
    logo: "/integrations/teams.webp",
    available: false,
  },
];

/** What to show for one integration, from what the API says is connected. */
export function stateOf(
  integration: Pick<Integration, "key" | "available">,
  statuses: IntegrationStatus[] | undefined,
): { state: IntegrationState; accountEmail: string | null } {
  if (!integration.available) return { state: "coming_soon", accountEmail: null };
  const status = statuses?.find((s) => s.provider === integration.key);
  return status?.connected
    ? { state: "connected", accountEmail: status.accountEmail }
    : { state: "not_connected", accountEmail: null };
}
