export interface ExchangeCodeResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  accountEmail: string;
  scopes: string[];
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface CreateMeetingInput {
  eventName: string;
  scheduledAt: Date;
  durationMinutes: number;
  /** Guests to invite to the meeting event (e.g. the candidate). */
  attendeeEmails?: string[];
  /** False to add the calendar event without a video link. Defaults to true. */
  withVideoLink?: boolean;
  /** An address, or a link made elsewhere, shown as the event's place. */
  location?: string | null;
  description?: string | null;
}

export interface CreateMeetingResult {
  /** Null when the event was made without a video link. */
  meetingUrl: string | null;
  providerMeetingId?: string;
}

export interface UpdateMeetingInput {
  eventName: string;
  scheduledAt: Date;
  durationMinutes: number;
}

export interface MeetingProviderClient {
  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<ExchangeCodeResult>;
  refreshAccessToken(refreshToken: string): Promise<RefreshTokenResult>;
  createMeeting(
    accessToken: string,
    input: CreateMeetingInput,
  ): Promise<CreateMeetingResult>;
  /** Move or rename a previously created event, notifying its attendees. */
  updateMeeting(accessToken: string, providerMeetingId: string, input: UpdateMeetingInput): Promise<void>;
  /** Cancel a previously created meeting event, notifying its attendees. */
  deleteMeeting(accessToken: string, providerMeetingId: string): Promise<void>;
}
