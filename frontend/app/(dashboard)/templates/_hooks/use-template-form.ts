"use client";

import { useState, useCallback } from "react";
import type { TemplateType } from "../_lib/template-form-types";
import { DEFAULT_DURATION_MINUTES, parseEventConfig, parseEmailBody } from "../_lib/template-form-utils";

export function useTemplateForm(initialType: TemplateType) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [emailBodyHtml, setEmailBodyHtml] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventTypeRadio, setEventTypeRadio] = useState<"virtual" | "onsite">(
    "virtual",
  );
  const [meetingUrl, setMeetingUrl] = useState("");
  const [autoGenerateMeet, setAutoGenerateMeet] = useState(false);
  const [location, setLocation] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [message, setMessage] = useState("");

  // Hydrate from existing template (for edit mode)
  const hydrate = useCallback(
    (data: {
      name: string;
      subject: string;
      bodyJson: unknown;
      type: TemplateType;
    }) => {
      setName(data.name);
      if (data.type === "event") {
        const config = parseEventConfig(data.bodyJson);
        if (config) {
          setEventName(config.eventName || data.name);
          setEventDesc(config.description || "");
          setEventTypeRadio(config.eventType || "virtual");
          setMeetingUrl(config.meetingUrl || "");
          setAutoGenerateMeet(!!config.autoGenerateMeet);
          setLocation(config.location || "");
          setDurationMinutes(config.durationMinutes || DEFAULT_DURATION_MINUTES);
          setMessage(config.message || "");
        }
      } else {
        setSubject(data.subject);
        setEmailBodyHtml(parseEmailBody(data.bodyJson));
      }
    },
    [],
  );

  return {
    name,
    setName,
    subject,
    setSubject,
    emailBodyHtml,
    setEmailBodyHtml,
    eventName,
    setEventName,
    eventDesc,
    setEventDesc,
    eventTypeRadio,
    setEventTypeRadio,
    meetingUrl,
    setMeetingUrl,
    autoGenerateMeet,
    setAutoGenerateMeet,
    location,
    setLocation,
    durationMinutes,
    setDurationMinutes,
    message,
    setMessage,
    hydrate,
  };
}
