"use client";

import { Video01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TEXTAREA_CLASS, INPUT_CLASS } from "../../../_lib/template-form-constants";
import { DURATION_OPTIONS } from "../../../_lib/template-form-utils";
import { formatDuration } from "../../../../_lib/format-duration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, FormSection } from "../form-field";
import { OptionCards, type CardOption } from "./option-cards";
import { MeetingUrlField } from "./meeting-url-field";
import { LocationField } from "./location-field";

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
  durationMinutes: number;
  onDurationChange: (minutes: number) => void;
  message: string;
  onMessageChange: (value: string) => void;
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
  durationMinutes,
  onDurationChange,
  message,
  onMessageChange,
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

        <FormField label="Length" htmlFor="template-duration">
          <Select
            value={String(durationMinutes)}
            onValueChange={(v) => v && onDurationChange(Number(v))}
            disabled={readOnly}
          >
            <SelectTrigger
              id="template-duration"
              className="h-9! w-44 cursor-pointer rounded-md border border-slate-300 bg-gray-100 px-3 text-sm text-slate-900 shadow-none focus-visible:ring-0 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <SelectValue>{formatDuration(durationMinutes)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {formatDuration(minutes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <FormSection
        title="Message to the candidate"
        description="Sent in the email that asks them to pick a time. You can change it for each interview."
      >
        <FormField
          label="Message"
          htmlFor="template-message"
          hint="Leave it empty to use the wording of the automatic “Interview: pick a time” email."
          optional
        >
          <Textarea
            id="template-message"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            readOnly={readOnly}
            rows={4}
            placeholder="e.g. We enjoyed your application and would like to talk through your experience."
            className={TEXTAREA_CLASS}
          />
        </FormField>
      </FormSection>
    </div>
  );
}
