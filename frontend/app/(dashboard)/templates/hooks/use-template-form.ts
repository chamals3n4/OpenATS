"use client";

import { useState, useCallback } from "react";
import type {
  Block,
  BlockKind,
  TimeSlot,
  TemplateType,
} from "../lib/template-form-types";
import { createEmptyBlock } from "../lib/template-form-utils";

export function useTemplateForm(initialType: TemplateType) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventTypeRadio, setEventTypeRadio] = useState<"virtual" | "onsite">(
    "virtual",
  );
  const [meetingUrl, setMeetingUrl] = useState("");
  const [autoGenerateMeet, setAutoGenerateMeet] = useState(false);
  const [location, setLocation] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ datetime: "" }]);

  // Block CRUD
  const addBlock = useCallback((kind: BlockKind) => {
    setBlocks((prev) => [...prev, createEmptyBlock(kind)]);
  }, []);

  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

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
        const { parseEventConfig } = require("../lib/template-form-utils");
        const config = parseEventConfig(data.bodyJson);
        if (config) {
          setEventName(config.eventName || data.name);
          setEventDesc(config.description || "");
          setEventTypeRadio(config.eventType || "virtual");
          setMeetingUrl(config.meetingUrl || "");
          setAutoGenerateMeet(!!config.autoGenerateMeet);
          setLocation(config.location || "");
          if (config.timeSlots?.length > 0) {
            setTimeSlots(
              config.timeSlots.map((dt: string) => ({ datetime: dt })),
            );
          }
        }
      } else {
        setSubject(data.subject);
        const { parseEmailBlocks } = require("../lib/template-form-utils");
        setBlocks(parseEmailBlocks(data.bodyJson));
      }
    },
    [],
  );

  return {
    name,
    setName,
    subject,
    setSubject,
    blocks,
    addBlock,
    updateBlock,
    deleteBlock,
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
