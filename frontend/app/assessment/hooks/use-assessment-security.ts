"use client";

import { useEffect, useRef } from "react";

interface UseAssessmentSecurityProps {
  screen: string;
  onViolation: (reason: string) => void;
  onWarning: (message: string) => void;
}

export function useAssessmentSecurity({
  screen,
  onViolation,
  onWarning,
}: UseAssessmentSecurityProps) {
  const violationTriggeredRef = useRef(false);

  const submitOnViolation = (reason: string) => {
    if (screen !== "quiz") return;
    if (violationTriggeredRef.current) return;
    violationTriggeredRef.current = true;
    onViolation(reason);
  };

  useEffect(() => {
    if (screen !== "quiz") return;

    const tryEnterFullscreen = async () => {
      if (document.fullscreenElement) return;
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        onWarning(
          "Fullscreen could not be enabled on this device. Do not leave this window.",
        );
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        submitOnViolation(
          "Assessment auto-submitted: you switched tabs or minimized the browser.",
        );
      }
    };

    const onBlur = () => {
      submitOnViolation(
        "Assessment auto-submitted: the assessment window lost focus.",
      );
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        submitOnViolation(
          "Assessment auto-submitted: fullscreen mode was exited.",
        );
      }
    };

    void tryEnterFullscreen();
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [screen]);

  return { submitOnViolation };
}
