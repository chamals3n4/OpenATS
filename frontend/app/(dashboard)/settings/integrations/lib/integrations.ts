import type { Integration } from "@/app/(dashboard)/settings/integrations/_components/integration-card";

export const integrations: Integration[] = [
  {
    name: "Google Meet",
    description: "Automatically create Google Meet links for scheduled interviews.",
    logo: "/integrations/meet.webp",
    url: "https://meet.google.com",
    provider: "google_meet",
  },
  {
    name: "Zoom",
    description: "Automatically create Zoom meetings for scheduled interviews.",
    logo: "/integrations/zoom.webp",
    url: "https://zoom.us",
  },
  {
    name: "Microsoft Teams",
    description: "Automatically create Microsoft Teams meetings for scheduled interviews.",
    logo: "/integrations/teams.webp",
    url: "https://www.microsoft.com/en/microsoft-teams/group-chat-software",
  },
];
