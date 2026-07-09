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
}

export interface CreateMeetingResult {
  meetingUrl: string;
  providerMeetingId?: string;
}

export interface MeetingProviderClient {
  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<ExchangeCodeResult>;
  refreshAccessToken(refreshToken: string): Promise<RefreshTokenResult>;
  createMeeting(
    accessToken: string,
    input: CreateMeetingInput,
  ): Promise<CreateMeetingResult>;
  /** Cancel a previously created meeting event, notifying its attendees. */
  deleteMeeting(accessToken: string, providerMeetingId: string): Promise<void>;
}
