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
}: EventBuilderProps) {
  return (
    <>
      <div className="space-y-2">
        <Label className={LABEL_CLASS}>Event Name</Label>
        <Input
          placeholder="e.g. Technical Interview Round 1"
          value={eventName}
          onChange={(e) => onEventNameChange(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="space-y-2">
        <Label className={LABEL_CLASS}>
          Description{" "}
          <span className="text-slate-400 dark:text-neutral-500 font-normal">
            (for hiring team context)
          </span>
        </Label>
        <textarea
          value={eventDesc}
          onChange={(e) => onEventDescChange(e.target.value)}
          rows={3}
          placeholder="e.g. Focus on system design and architecture"
          className={TEXTAREA_CLASS}
        />
      </div>

      <EventTypeSelector value={eventTypeRadio} onChange={onEventTypeChange} />

      {eventTypeRadio === "virtual" && (
        <MeetingUrlField value={meetingUrl} onChange={onMeetingUrlChange} />
      )}

      <TimeSlotsEditor
        slots={timeSlots}
        onAdd={onAddSlot}
        onUpdate={onUpdateSlot}
        onRemove={onRemoveSlot}
      />
    </>
  );
}
