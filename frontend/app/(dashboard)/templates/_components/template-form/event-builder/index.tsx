"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  TEXTAREA_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
} from "../../../lib/template-form-constants";
import { EventTypeSelector } from "./event-type-selector";
import { MeetingUrlField } from "./meeting-url-field";
import { LocationField } from "./location-field";

interface EventBuilderProps {
  eventName: string;
  onEventNameChange: (value: string) => void;
  eventDesc: string;
  onEventDescChange: (value: string) => void;
  eventTypeRadio: "virtual" | "onsite";
  onEventTypeChange: (type: "virtual" | "onsite") => void;
  meetingUrl: string;
  onMeetingUrlChange: (value: string) => void;
  autoGenerateMeet: boolean;
  onAutoGenerateMeetChange: (value: boolean) => void;
  location: string;
  onLocationChange: (value: string) => void;
  readOnly?: boolean;
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
      {children}
    </h3>
  );
}

export function EventBuilder({
  eventName,
  onEventNameChange,
  eventDesc,
  onEventDescChange,
  eventTypeRadio,
  onEventTypeChange,
  meetingUrl,
  onMeetingUrlChange,
  autoGenerateMeet,
  onAutoGenerateMeetChange,
  location,
  onLocationChange,
  readOnly = false,
}: EventBuilderProps) {
  return (
    <>
      <section className="space-y-4 pb-4 border-b border-slate-100 dark:border-neutral-800/80">
        <SectionHeading>Details</SectionHeading>

        <div className="space-y-1.5">
          <Label className={LABEL_CLASS}>Event Name</Label>
          <Input
            placeholder="e.g. Technical Interview Round 1"
            value={eventName}
            onChange={(e) => onEventNameChange(e.target.value)}
            readOnly={readOnly}
            className={INPUT_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={LABEL_CLASS}>
            Description{" "}
            <span className="text-slate-400 dark:text-neutral-500 font-normal">
              (optional)
            </span>
          </Label>
          <Textarea
            value={eventDesc}
            onChange={(e) => onEventDescChange(e.target.value)}
            readOnly={readOnly}
            rows={2}
            placeholder="Brief context for the hiring team"
            className={TEXTAREA_CLASS}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading>Location</SectionHeading>

        <EventTypeSelector value={eventTypeRadio} onChange={onEventTypeChange} readOnly={readOnly} />

        {eventTypeRadio === "virtual" && (
          <MeetingUrlField
            value={meetingUrl}
            onChange={onMeetingUrlChange}
            autoGenerateMeet={autoGenerateMeet}
            onAutoGenerateMeetChange={onAutoGenerateMeetChange}
            readOnly={readOnly}
          />
        )}

        {eventTypeRadio === "onsite" && (
          <LocationField value={location} onChange={onLocationChange} readOnly={readOnly} />
        )}
      </section>
    </>
  );
}
