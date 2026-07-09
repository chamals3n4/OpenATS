export interface Slot {
  datetime: string;
  selected: boolean;
  /** Already confirmed by another interview — shown but not selectable. */
  taken?: boolean;
}

export interface InterviewData {
  eventName: string;
  eventType: string;
  meetingUrl: string | null;
  location: string | null;
  bodyText: string | null;
  status: string;
  jobTitle: string;
  candidateName: string;
  timeSlots: Slot[] | null;
}
