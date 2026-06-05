import { google } from "googleapis";
import logger from "../utils/logger";

// ---------------------------------------------------------------------------
// Google Calendar integration via Service Account
//
// The company admin creates a Google Cloud Service Account, downloads a JSON
// key, and pastes the content into GOOGLE_SERVICE_ACCOUNT_JSON in .env.
//
// All interview events are created on the calendar specified by
// GOOGLE_CALENDAR_ID (the email address of the shared company calendar).
// No per-user OAuth. No token refresh. One-time setup.
// ---------------------------------------------------------------------------

/** Lazily load the service account credentials */
function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set in .env");

  const key = JSON.parse(raw);

  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
}

let _calendarClient: ReturnType<typeof google.calendar> | null = null;

/** Get or create the authenticated Calendar client (lazy, cached). */
function getCalendarClient() {
  if (_calendarClient) return _calendarClient;

  const auth = getAuth();
  _calendarClient = google.calendar({ version: "v3", auth });
  return _calendarClient;
}

/** The calendar ID to create events on (e.g. "company@example.com" or "primary") */
function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

// ── Event CRUD ─────────────────────────────────────────────────────────────

export interface CalendarEventInput {
  interviewId: number;
  candidateName: string;
  jobTitle: string;
  stageName: string;
  scheduledAt: Date;
  durationMinutes: number;
  notes: string | null;
  attendeeEmails: string[];
}

/** Create a Google Calendar event and return the event ID. */
export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<string> {
  const calendar = getCalendarClient();
  const endTime = new Date(
    input.scheduledAt.getTime() + input.durationMinutes * 60_000,
  );

  const event = await calendar.events.insert({
    calendarId: getCalendarId(),
    requestBody: {
      summary: `Interview: ${input.candidateName} — ${input.jobTitle}`,
      description: [
        `Candidate: ${input.candidateName}`,
        `Job: ${input.jobTitle}`,
        `Stage: ${input.stageName}`,
        input.notes ? `Notes: ${input.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: input.scheduledAt.toISOString(), timeZone: "UTC" },
      end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
      attendees: input.attendeeEmails.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    },
  });

  if (!event.data.id) throw new Error("Failed to create calendar event");
  return event.data.id;
}

/** Update an existing calendar event. */
export async function updateCalendarEvent(
  googleEventId: string,
  input: CalendarEventInput,
) {
  const calendar = getCalendarClient();
  const endTime = new Date(
    input.scheduledAt.getTime() + input.durationMinutes * 60_000,
  );

  await calendar.events.update({
    calendarId: getCalendarId(),
    eventId: googleEventId,
    requestBody: {
      summary: `Interview: ${input.candidateName} — ${input.jobTitle}`,
      start: { dateTime: input.scheduledAt.toISOString(), timeZone: "UTC" },
      end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
      attendees: input.attendeeEmails.map((email) => ({ email })),
    },
  });
}

/** Delete a calendar event. */
export async function deleteCalendarEvent(googleEventId: string) {
  const calendar = getCalendarClient();
  await calendar.events.delete({
    calendarId: getCalendarId(),
    eventId: googleEventId,
  });
}
