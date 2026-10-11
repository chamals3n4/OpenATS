"use client";

import { Video01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TEXTAREA_CLASS, INPUT_CLASS } from "../../../lib/template-form-constants";
import type { TimeSlot } from "../../../lib/template-form-types";
import { FormField, FormSection } from "../form-field";
import { OptionCards, type CardOption } from "./option-cards";
import { MeetingUrlField } from "./meeting-url-field";
import { LocationField } from "./location-field";
import { TimeSlotsEditor } from "./time-slots-editor";

type EventType = "virtual" | "onsite";

const EVENT_TYPES: CardOption<EventType>[] = [
  { value: "virtual", label: "Virtual", description: "A video call", icon: Video01Icon },
  { value: "onsite", label: "On-site", description: "In person, at an address", icon: Location01Icon },
];

interface EventBuilderProps {
  eventName: string;
  onEventNameChange: (value: string) => void;
  nameError?: string | undefined;
  eventDesc: string;
  onEventDescChange: (value: string) => void;
  eventTypeRadio: EventType;
  onEventTypeChange: (type: EventType) => void;
  meetingUrl: string;
  onMeetingUrlChange: (value: string) => void;
  autoGenerateMeet: boolean;
  onAutoGenerateMeetChange: (value: boolean) => void;
  location: string;
  onLocationChange: (value: string) => void;
  timeSlots: TimeSlot[];
  onAddSlot: () => void;
  onUpdateSlot: (index: number, datetime: string) => void;
  onRemoveSlot: (index: number) => void;
  readOnly?: boolean;
}

export function EventBuilder({
  eventName,
  onEventNameChange,
  nameError,
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
  timeSlots,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  readOnly = false,
}: EventBuilderProps) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-neutral-800">
      <FormSection title="Details">
        <FormField
          label="Event name"
          htmlFor="template-name"
          hint="Candidates see this as the title of their interview."
          error={nameError}
        >
          <Input
            id="template-name"
            placeholder="e.g. Technical interview, round 1"
            value={eventName}
            onChange={(e) => onEventNameChange(e.target.value)}
            readOnly={readOnly}
            aria-invalid={!!nameError || undefined}
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField
          label="Note for your team"
          htmlFor="template-note"
          hint="Candidates do not see this."
          optional
        >
          <Textarea
            id="template-note"
            value={eventDesc}
            onChange={(e) => onEventDescChange(e.target.value)}
            readOnly={readOnly}
            rows={2}
            placeholder="e.g. Use for backend roles"
            className={TEXTAREA_CLASS}
          />
        </FormField>
      </FormSection>

      <FormSection title="Where" description="How the interview takes place.">
        <OptionCards
          label="Interview type"
          value={eventTypeRadio}
          onChange={onEventTypeChange}
          options={EVENT_TYPES}
          disabled={readOnly}
        />

        {eventTypeRadio === "virtual" ? (
          <MeetingUrlField
            value={meetingUrl}
            onChange={onMeetingUrlChange}
            autoGenerateMeet={autoGenerateMeet}
            onAutoGenerateMeetChange={onAutoGenerateMeetChange}
            readOnly={readOnly}
          />
        ) : (
          <LocationField value={location} onChange={onLocationChange} readOnly={readOnly} />
        )}
      </FormSection>

      <FormSection title="Time slots" description="The times you offer. Each candidate picks one.">
        <TimeSlotsEditor
          slots={timeSlots}
          onAdd={onAddSlot}
          onUpdate={onUpdateSlot}
          onRemove={onRemoveSlot}
          readOnly={readOnly}
        />
      </FormSection>
    </div>
  );
}
