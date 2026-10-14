"use client";

import { Input } from "@/components/ui/input";
import { INPUT_CLASS } from "../../../_lib/template-form-constants";
import { FormField } from "../form-field";

interface LocationFieldProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function LocationField({ value, onChange, readOnly = false }: LocationFieldProps) {
  return (
    <FormField label="Address" htmlFor="template-location" hint="Include the building, floor or room if it helps.">
      <Input
        id="template-location"
        placeholder="e.g. 12 Park Street, 4th floor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={INPUT_CLASS}
      />
    </FormField>
  );
}
