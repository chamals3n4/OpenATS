"use client";

import { useState, useCallback } from "react";
import type { TimeSlot, TemplateType } from "../lib/template-form-types";
import { parseEventConfig, parseEmailBody } from "../lib/template-form-utils";

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
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ datetime: "" }]);

  // Time slot CRUD
  const addSlot = useCallback(() => {
    setTimeSlots((prev) => [...prev, { datetime: "" }]);
  }, []);

  const updateSlot = useCallback((index: number, datetime: string) => {
    setTimeSlots((prev) => {
      const next = [...prev];
      next[index] = { datetime };
      return next;
    });
  }, []);

  const removeSlot = useCallback((index: number) => {
    setTimeSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

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
          if ((config.timeSlots?.length ?? 0) > 0) {
            setTimeSlots(
              config.timeSlots!.map((dt: string) => ({ datetime: dt })),
            );
          }
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
    timeSlots,
    addSlot,
    updateSlot,
    removeSlot,
    hydrate,
  };
}
