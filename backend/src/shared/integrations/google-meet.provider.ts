import { randomUUID } from "crypto";
import { google } from "googleapis";
import type {
  CreateMeetingInput,
  CreateMeetingResult,
  ExchangeCodeResult,
  MeetingProviderClient,
  RefreshTokenResult,
} from "./types";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI must be set",
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function fetchAccountEmail(accessToken: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Google account email: ${res.status}`);
  }
  const data = (await res.json()) as { email?: string };
  if (!data.email) {
    throw new Error("Google userinfo response did not include an email");
  }
  return data.email;
}

export const googleMeetProvider: MeetingProviderClient = {
  getAuthUrl(state: string): string {
    const client = getOAuthClient();
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state,
    });
  },

  async exchangeCode(code: string): Promise<ExchangeCodeResult> {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error(
        "Google did not return both an access token and a refresh token — ensure prompt=consent and access_type=offline are set",
      );
    }
    const accountEmail = await fetchAccountEmail(tokens.access_token);
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600_000),
      accountEmail,
      scopes: tokens.scope ? tokens.scope.split(" ") : SCOPES,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResult> {
    const client = getOAuthClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error("Google did not return an access token on refresh");
    }
    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token ?? undefined,
      expiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600_000),
    };
  },

  async createMeeting(
    accessToken: string,
    input: CreateMeetingInput,
  ): Promise<CreateMeetingResult> {
    const client = getOAuthClient();
    client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: client });

    const endTime = new Date(
      input.scheduledAt.getTime() + input.durationMinutes * 60_000,
    );

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: input.eventName,
        start: { dateTime: input.scheduledAt.toISOString(), timeZone: "UTC" },
        end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
        attendees: input.attendeeEmails?.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetingUrl = event.data.hangoutLink;
    if (!meetingUrl) {
      throw new Error("Google did not return a Meet link for the created event");
    }
    return { meetingUrl, providerMeetingId: event.data.id ?? undefined };
  },

  async deleteMeeting(
    accessToken: string,
    providerMeetingId: string,
  ): Promise<void> {
    const client = getOAuthClient();
    client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: client });
    await calendar.events.delete({
      calendarId: "primary",
      eventId: providerMeetingId,
      sendUpdates: "all",
    });
  },
};
