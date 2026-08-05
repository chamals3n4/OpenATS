import type { meetingProvider } from "../../db/schema/enums";
import type { MeetingProviderClient } from "./types";
import { googleMeetProvider } from "./google-meet.provider";

type MeetingProviderId = (typeof meetingProvider.enumValues)[number];

const registry: Record<MeetingProviderId, MeetingProviderClient> = {
  google_meet: googleMeetProvider,
};

export function getProviderClient(provider: MeetingProviderId): MeetingProviderClient {
  return registry[provider];
}
