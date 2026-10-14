"use client";

import { GoogleIcon, Link01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { INPUT_CLASS } from "../../../_lib/template-form-constants";
import { FormField } from "../form-field";
import { OptionCards, type CardOption } from "./option-cards";

type LinkSource = "auto" | "manual";

const OPTIONS: CardOption<LinkSource>[] = [
  { value: "auto", label: "Google Meet", description: "Create a new link for each interview", icon: GoogleIcon },
  { value: "manual", label: "My own link", description: "Zoom, Teams or any other link", icon: Link01Icon },
];

interface MeetingUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  autoGenerateMeet: boolean;
  onAutoGenerateMeetChange: (value: boolean) => void;
  readOnly?: boolean;
}

export function MeetingUrlField({
  value,
  onChange,
  autoGenerateMeet,
  onAutoGenerateMeetChange,
  readOnly = false,
}: MeetingUrlFieldProps) {
  return (
    <div className="space-y-3">
      <FormField
        label="Meeting link"
        hint={
          autoGenerateMeet
            ? "The link is made with the interviewer's connected Google account when the interview is scheduled."
            : undefined
        }
      >
        <OptionCards
          label="Meeting link"
          value={autoGenerateMeet ? "auto" : "manual"}
          onChange={(source) => onAutoGenerateMeetChange(source === "auto")}
          options={OPTIONS}
          disabled={readOnly}
        />
      </FormField>

      {!autoGenerateMeet && (
        <FormField label="Link" htmlFor="template-meeting-url" hint="Every interview from this template uses the same link.">
          <Input
            id="template-meeting-url"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            className={INPUT_CLASS}
          />
        </FormField>
      )}
    </div>
  );
}
