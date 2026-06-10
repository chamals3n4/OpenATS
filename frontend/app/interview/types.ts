export interface Slot {
  datetime: string;
  selected: boolean;
}

export interface InterviewData {
  eventName: string;
  eventType: string;
  meetingUrl: string | null;
  bodyText: string | null;
  status: string;
  jobTitle: string;
  candidateName: string;
  timeSlots: Slot[] | null;
}
