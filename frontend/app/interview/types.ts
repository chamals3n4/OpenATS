export interface Slot {
  datetime: string;
  selected: boolean;
  /** Taken by another interview */
  taken?: boolean;
}

export interface InterviewData {
  eventName: string;
  eventType: string;
  meetingUrl: string | null;
  location: string | null;
  bodyText: string | null;
  durationMinutes?: number | null;
  status: string;
  jobTitle: string;
  candidateName: string;
  timeSlots: Slot[] | null;
}
