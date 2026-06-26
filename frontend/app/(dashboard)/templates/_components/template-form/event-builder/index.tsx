"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TEXTAREA_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
} from "../../../lib/template-form-constants";
import { EventTypeSelector } from "./event-type-selector";
import { MeetingUrlField } from "./meeting-url-field";
import { TimeSlotsEditor } from "./time-slots-editor";

interface EventBuilderProps {
  eventName: string;
  onEventNameChange: (value: string) => void;
  eventDesc: string;
  onEventDescChange: (value: string) => void;
  eventTypeRadio: "virtual" | "onsite";
  onEventTypeChange: (type: "virtual" | "onsite") => void;
  meetingUrl: string;
  onMeetingUrlChange: (value: string) => void;
  timeSlots: { datetime: string }[];
  onAddSlot: () => void;
  onUpdateSlot: (index: number, datetime: string) => void;
  onRemoveSlot: (index: number) => void;
  readOnly?: boolean;
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
  timeSlots,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  readOnly = false,
}: EventBuilderProps) {
  return (
    <>
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
        <textarea
          value={eventDesc}
          onChange={(e) => onEventDescChange(e.target.value)}
          readOnly={readOnly}
          rows={2}
          placeholder="Brief context for the hiring team"
          className={TEXTAREA_CLASS}
        />
      </div>

      <EventTypeSelector value={eventTypeRadio} onChange={onEventTypeChange} readOnly={readOnly} />

      {eventTypeRadio === "virtual" && (
        <MeetingUrlField value={meetingUrl} onChange={onMeetingUrlChange} readOnly={readOnly} />
      )}

      <TimeSlotsEditor
        slots={timeSlots}
        onAdd={onAddSlot}
        onUpdate={onUpdateSlot}
        onRemove={onRemoveSlot}
        readOnly={readOnly}
      />
    </>
  );
}
