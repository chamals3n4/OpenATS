"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── API ───────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/public${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = "short_answer" | "long_answer" | "checkbox" | "radio" | "multiple_choice";

interface Option {
  id: number;
  label: string;
  position: number;
}

interface Question {
  id: number;
  title: string;
  description: string | null;
  questionType: QuestionType;
  position: number;
  points: number;
  options: Option[];
}

interface AttemptData {
  id: number;
  status: "pending" | "started" | "completed";
  expiresAt: string;
  startedAt: string | null;
  completedAt: string | null;
  assessment: {
    id: number;
    title: string;
    description: string | null;
    timeLimit: number;
    questions: Question[];
  };
  candidate: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

type Answer = { answerText?: string; optionIds?: number[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** API `timeLimit` is stored in minutes; the quiz timer counts down in seconds. */
function timeLimitToSeconds(minutes: number) {
  return Math.max(0, Math.floor(minutes * 60));
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DARK = "var(--assessment-dark)";
const LIGHT_BG = "var(--assessment-bg)";
const WHITE = "var(--assessment-white)";
const BORDER = "var(--assessment-border)";
const TEXT_MAIN = "var(--assessment-text-main)";
const TEXT_MUTED = "var(--assessment-text-muted)";
const TEXT_LIGHT = "var(--assessment-text-light)";
const EMERALD = "#22c55e";
const SELECTED_BG = "var(--assessment-selected-bg)";

// ── SVG Icons (unchanged) ─────────────────────────────────────────────────────

function CheckIcon({ color = DARK, size = 22 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={color} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
function BigCheckIcon() {
  return (
    <svg width="68" height="68" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke={EMERALD} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth={selected ? 2.5 : 1.5} stroke={selected ? DARK : "#cbd5e1"} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />{selected && <circle cx="12" cy="12" r="5" fill={DARK} />}
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke={EMERALD} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" stroke={TEXT_MUTED} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type Screen = "loading" | "error" | "expired" | "already_completed" | "intro" | "quiz" | "submitted";

export default function AssessmentPage() {
  const params = useParams();
  const token = String(params.id ?? "");

  const [screen, setScreen] = useState<Screen>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [attempt, setAttempt] = useState<AttemptData | null>(null);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quitOpen, setQuitOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<{ passed: boolean; scorePercentage: number } | null>(null);
  const [submissionReason, setSubmissionReason] = useState<string | null>(null);
  const [restrictionWarning, setRestrictionWarning] = useState<string | null>(null);
  const violationTriggeredRef = useRef(false);

  // ── Fetch assessment on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: AttemptData }>(`/assessment/${token}`)
      .then(({ data }) => {
        setAttempt(data);
        if (data.status === "completed") {
          setScreen("already_completed");
        } else if (data.status === "started") {
          // Resume — go straight to quiz
          const elapsed = data.startedAt
            ? Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000)
            : 0;
          const totalSecs = timeLimitToSeconds(data.assessment.timeLimit ?? 0);
          const remaining = Math.max(0, totalSecs - elapsed);
          setTimeLeft(remaining);
          setScreen("quiz");
        } else {
          setTimeLeft(timeLimitToSeconds(data.assessment.timeLimit ?? 0));
          setScreen("intro");
        }
      })
      .catch((e: Error) => {
        if (e.message.toLowerCase().includes("expired")) setScreen("expired");
        else { setErrorMsg(e.message); setScreen("error"); }
      });
  }, [token]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "quiz") return;
    if (timeLeft <= 0) { handleComplete(); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, timeLeft]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setStarting(true);
    try {
      await apiFetch(`/assessment/${token}/start`, { method: "POST" });
      violationTriggeredRef.current = false;
      setSubmissionReason(null);
      setScreen("quiz");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to start");
      setScreen("error");
    } finally {
      setStarting(false);
    }
  };

  const saveCurrentAnswer = useCallback(async (qId: number, answer: Answer) => {
    const payload: { questionId: number; answerText?: string | null; optionIds?: number[] } = {
      questionId: qId,
    };
    if (answer.answerText !== undefined) payload.answerText = answer.answerText || null;
    if (answer.optionIds !== undefined) payload.optionIds = answer.optionIds;
    await apiFetch(`/assessment/${token}/answer`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, [token]);

  const handleComplete = async (reason?: string) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Save ALL answered questions before completing
      const qs = attempt?.assessment.questions ?? [];
      await Promise.all(
        qs
          .filter((q) => answers[q.id])
          .map((q) => saveCurrentAnswer(q.id, answers[q.id]).catch(() => {}))
      );

      const res = await apiFetch<{ message: string; data: { passed: boolean; scorePercentage: number } }>(
        `/assessment/${token}/complete`,
        {
          method: "POST",
          body: JSON.stringify(reason ? { autoSubmitReason: reason } : {}),
        }
      );
      setScoreResult(res.data);
      if (reason) setSubmissionReason(reason);
      setScreen("submitted");
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOnViolation = useCallback((reason: string) => {
    if (screen !== "quiz") return;
    if (violationTriggeredRef.current) return;
    violationTriggeredRef.current = true;
    void handleComplete(reason);
  }, [screen, handleComplete]);

  useEffect(() => {
    if (!restrictionWarning) return;
    const t = setTimeout(() => setRestrictionWarning(null), 3500);
    return () => clearTimeout(t);
  }, [restrictionWarning]);

  // Fullscreen + focus enforcement during quiz.
  useEffect(() => {
    if (screen !== "quiz") return;

    const tryEnterFullscreen = async () => {
      if (document.fullscreenElement) return;
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        setRestrictionWarning("Fullscreen could not be enabled on this device. Do not leave this window.");
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        submitOnViolation("Assessment auto-submitted: you switched tabs or minimized the browser.");
      }
    };

    const onBlur = () => {
      submitOnViolation("Assessment auto-submitted: the assessment window lost focus.");
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        submitOnViolation("Assessment auto-submitted: fullscreen mode was exited.");
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
  }, [screen, submitOnViolation]);


  const goNext = async () => {
    if (!attempt) return;
    const q = attempt.assessment.questions[currentQ];
    if (q && answers[q.id]) {
      await saveCurrentAnswer(q.id, answers[q.id]).catch(() => { });
    }
    if (currentQ < attempt.assessment.questions.length - 1) {
      setCurrentQ((i) => i + 1);
    } else {
      await handleComplete();
    }
  };

  const goPrev = async () => {
    if (!attempt || currentQ === 0) return;
    const q = attempt.assessment.questions[currentQ];
    if (q && answers[q.id]) {
      await saveCurrentAnswer(q.id, answers[q.id]).catch(() => { });
    }
    setCurrentQ((i) => i - 1);
  };

  const toggleOption = (qId: number, optId: number, multi: boolean) => {
    setAnswers((prev) => {
      const cur = prev[qId]?.optionIds ?? [];
      if (multi) {
        const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId];
        return { ...prev, [qId]: { optionIds: next } };
      }
      return { ...prev, [qId]: { optionIds: [optId] } };
    });
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const questions = attempt?.assessment.questions ?? [];
  const total = questions.length;
  const question = questions[currentQ];

  const isAnswered = (q: Question) => {
    const a = answers[q.id];
    if (!a) return false;
    if (a.optionIds) return a.optionIds.length > 0;
    return (a.answerText ?? "").trim().length > 0;
  };
  const answered = questions.filter(isAnswered).length;
  const progress = total > 0 ? (currentQ / total) * 100 : 0;

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === "loading") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: LIGHT_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: TEXT_MUTED, fontSize: 15 }}>Loading assessment…</p>
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: LIGHT_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#ef4444", fontSize: 15 }}>{errorMsg || "Something went wrong."}</p>
      </div>
    );
  }

  if (screen === "expired") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: LIGHT_BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ maxWidth: 480, width: "100%", backgroundColor: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "48px 40px", textAlign: "center" }}>
          <p style={{ fontSize: 36, margin: "0 0 16px 0" }}>⏰</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT_MAIN, margin: "0 0 10px 0" }}>Link Expired</h1>
          <p style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.7, margin: 0 }}>This assessment link has expired. Please contact the hiring team for a new invitation.</p>
        </div>
      </div>
    );
  }

  if (screen === "already_completed") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: LIGHT_BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ maxWidth: 480, width: "100%", backgroundColor: WHITE, borderRadius: 16, border: "1.5px solid #bbf7d0", padding: "48px 40px", textAlign: "center" }}>
          <BigCheckIcon />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT_MAIN, margin: "20px 0 10px 0" }}>Already Submitted</h1>
          <p style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.7, margin: 0 }}>You have already completed this assessment. Your responses have been recorded.</p>
        </div>
      </div>
    );
  }

  if (screen === "submitted") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: LIGHT_BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ width: "100%", maxWidth: 520, backgroundColor: WHITE, borderRadius: 16, border: "1.5px solid #bbf7d0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "56px 48px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
          <BigCheckIcon />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: TEXT_MAIN, margin: 0 }}>Quiz Submitted!</h1>
            <p style={{ fontSize: 14, color: TEXT_MUTED, margin: 0, lineHeight: 1.7 }}>
              Thank you for completing <strong>{attempt?.assessment.title}</strong>,{" "}
              {attempt?.candidate.firstName}.
            </p>
            {submissionReason && (
              <p style={{ fontSize: 13, color: "#b45309", margin: 0, lineHeight: 1.7 }}>
                {submissionReason}
              </p>
            )}
          </div>
          <div style={{ width: "100%", backgroundColor: "#f8fafc", borderRadius: 12, padding: "20px 32px", display: "flex", flexDirection: "column", gap: 8, textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_MAIN, margin: 0 }}>
              Questions Answered: <span style={{ color: DARK }}>{answered} of {total}</span>
            </p>
            {scoreResult?.passed && (
              <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_MAIN, margin: 0 }}>
                Result:{" "}
                <span style={{ color: "#16a34a" }}>Passed ✓</span>
              </p>
            )}
            <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0, lineHeight: 1.6 }}>
              Your responses have been recorded. We will review your answers and provide feedback soon.
            </p>
          </div>
          <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: 0 }}>
            A confirmation will be sent to {attempt?.candidate.email}
          </p>
        </div>
      </div>
    );
  }

  if (screen === "intro" && attempt) {
    const timeMins = attempt.assessment.timeLimit ?? 0;
    return (
      <div style={{ minHeight: "100vh", backgroundColor: LIGHT_BG, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 16px" }}>
        <div style={{ width: "100%", maxWidth: 900, backgroundColor: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ backgroundColor: DARK, padding: "40px 40px" }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: WHITE, margin: 0, marginBottom: 8, lineHeight: 1.3 }}>
              {attempt.assessment.title}
            </h1>
            {attempt.assessment.description && (
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.6 }}>
                {attempt.assessment.description}
              </p>
            )}
          </div>

          <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: 32 }}>
            <div>
              <p style={{ fontSize: 14, color: TEXT_MUTED, margin: "0 0 6px 0" }}>
                Hello, <strong style={{ color: TEXT_MAIN }}>{attempt.candidate.firstName} {attempt.candidate.lastName}</strong>
              </p>
              <p style={{ fontSize: 14, color: TEXT_MUTED, margin: 0 }}>
                {attempt.assessment.questions.length} questions · {timeMins} minutes
              </p>
            </div>

            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: TEXT_MAIN, margin: "0 0 20px 0" }}>Important Guidelines</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  `You will have ${timeMins} minutes to complete this assessment. The timer will automatically submit when time expires.`,
                  "Answer all questions to the best of your ability. You can navigate between questions using the Previous/Next buttons.",
                  "Read each question carefully and provide complete answers for text questions.",
                  "Once submitted, your answers cannot be changed. Review your responses before clicking Submit.",
                ].map((text, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <CheckIcon />
                    <span style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setPolicyOpen(true)}
              disabled={starting}
              style={{ width: "100%", height: 52, backgroundColor: starting ? "#94a3b8" : DARK, color: WHITE, border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: starting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "opacity 0.15s" }}
            >
              {starting ? "Starting…" : "Start Assessment"}
              {!starting && <PlayIcon />}
            </button>
            <AlertDialog open={policyOpen} onOpenChange={setPolicyOpen}>
              <AlertDialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
                    Strict Assessment Policy
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                    <span style={{ display: "block", marginBottom: 6 }}>
                      1. Do not exit the full screen mode.
                    </span>
                    <span style={{ display: "block" }}>
                      2. If you switch tabs, minimize, or move away from this assessment window, the assessment will be stopped and automatically submitted immediately.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[13px] font-medium shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleStart}
                    className="h-9 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-medium shadow-none border-none"
                  >
                    I Agree, Start
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz screen ────────────────────────────────────────────────────────────
  if (!question) return null;

  const isMulti = question.questionType === "checkbox";
  const isOption = question.questionType === "radio" || question.questionType === "multiple_choice" || question.questionType === "checkbox";
  const isText = question.questionType === "short_answer" || question.questionType === "long_answer";

  return (
    <div style={{ height: "100vh", backgroundColor: LIGHT_BG, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {restrictionWarning && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2000,
            backgroundColor: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#9a3412",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
          }}
        >
          {restrictionWarning}
        </div>
      )}

      {/* Header */}
      <div style={{ backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, padding: "16px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: TEXT_MAIN, margin: 0 }}>{attempt?.assessment.title}</h1>
            <p style={{ fontSize: 13, color: TEXT_MUTED, margin: "3px 0 0 0" }}>
              {attempt?.candidate.firstName} {attempt?.candidate.lastName}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <button
              onClick={() => setQuitOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 16px", border: "1px solid #fca5a5", borderRadius: 8, backgroundColor: "#fff1f2", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Quit
            </button>

            <AlertDialog open={quitOpen} onOpenChange={setQuitOpen}>
              <AlertDialogContent className="max-w-sm rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">Quit this quiz?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                    Your progress will be lost. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[13px] font-medium shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800">
                    Stay in Quiz
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => { window.location.href = "/"; }} className="h-9 px-5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium shadow-none border-none">
                    Yes, Quit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ClockIcon />
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: timeLeft < 120 ? "#ef4444" : TEXT_MAIN, margin: 0, lineHeight: 1 }}>
                  {formatTime(timeLeft)}
                </p>
                <p style={{ fontSize: 11, color: TEXT_LIGHT, margin: "3px 0 0 0" }}>Time Remaining</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TEXT_MUTED, marginBottom: 10 }}>
          <span>Question {currentQ + 1} of {total}</span>
          <span>{answered} Answered</span>
        </div>

        <div style={{ height: 8, backgroundColor: "var(--assessment-border)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, backgroundColor: DARK, borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Question area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px 28px 28px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", backgroundColor: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "36px 44px", display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <span style={{ display: "inline-block", backgroundColor: "rgba(34, 197, 94, 0.1)", color: DARK, fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 99, marginBottom: 16 }}>
                Question {currentQ + 1}
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT_MAIN, margin: "0 0 8px 0", lineHeight: 1.45 }}>{question.title}</h2>
              {question.description && (
                <p style={{ fontSize: 14, color: TEXT_MUTED, margin: 0 }}>{question.description}</p>
              )}
            </div>

            {/* Text answer */}
            {isText && (
              <div>
                <span style={{ display: "inline-block", backgroundColor: "rgba(37, 99, 235, 0.1)", color: "#2563eb", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  {question.questionType === "short_answer" ? "Short Answer" : "Long Answer"}
                </span>
                <textarea
                  placeholder="Type your answer here..."
                  value={answers[question.id]?.answerText ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: { answerText: e.target.value } }))}
                  rows={question.questionType === "long_answer" ? 7 : 3}
                  style={{ width: "100%", padding: "14px 16px", border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 15, color: TEXT_MAIN, backgroundColor: WHITE, resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", transition: "border-color 0.15s" }}
                  onFocus={(e) => (e.target.style.borderColor = DARK)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
                <p style={{ fontSize: 12, color: TEXT_LIGHT, margin: "8px 0 0 0" }}>
                  {((answers[question.id]?.answerText ?? "").trim().split(/\s+/).filter(Boolean).length)} words
                </p>
              </div>
            )}

            {/* Option answers (radio / checkbox / multiple_choice) */}
            {isOption && question.options.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {isMulti && (
                  <span style={{ display: "inline-block", backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#92400e", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, width: "fit-content" }}>
                    Multiple Select
                  </span>
                )}
                {question.options.map((opt) => {
                  const selectedIds = answers[question.id]?.optionIds ?? [];
                  const selected = selectedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(question.id, opt.id, isMulti)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 12, textAlign: "left", border: selected ? `1.5px solid ${DARK}` : `1px solid ${BORDER}`, backgroundColor: selected ? SELECTED_BG : WHITE, cursor: "pointer", transition: "all 0.15s" }}
                    >
                      {isMulti ? (
                        <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: selected ? `2px solid ${DARK}` : `2px solid var(--assessment-text-light)`, backgroundColor: selected ? DARK : WHITE, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                          {selected && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                      ) : (
                        <RadioCircle selected={selected} />
                      )}
                      <span style={{ fontSize: 15, color: selected ? DARK : TEXT_MAIN, fontWeight: selected ? 600 : 400 }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Submit error */}
            {submitError && (
              <div style={{ backgroundColor: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#dc2626", lineHeight: 1.5 }}>
                {submitError}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
              <button onClick={goPrev} disabled={currentQ === 0} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 22px", border: `1px solid ${BORDER}`, borderRadius: 10, backgroundColor: WHITE, fontSize: 14, fontWeight: 600, color: TEXT_MUTED, cursor: currentQ === 0 ? "not-allowed" : "pointer", opacity: currentQ === 0 ? 0.4 : 1, transition: "opacity 0.15s" }}>
                <ArrowLeft />Previous
              </button>
              <button onClick={goNext} disabled={submitting} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 26px", border: "none", borderRadius: 10, backgroundColor: submitting ? "#94a3b8" : DARK, fontSize: 14, fontWeight: 600, color: WHITE, cursor: submitting ? "not-allowed" : "pointer", transition: "opacity 0.15s" }}>
                {submitting ? "Submitting…" : currentQ === total - 1 ? "Submit Quiz" : "Next Question"}
                {!submitting && <ArrowRight />}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 300, flexShrink: 0, backgroundColor: WHITE, borderLeft: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflowY: "auto", padding: "24px 22px", gap: 20 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px 0" }}>Questions</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {questions.map((q, i) => {
                const isAns = isAnswered(q);
                const isCurrent = i === currentQ;
                const bg = isCurrent ? DARK : isAns ? "rgba(34, 197, 94, 0.15)" : "var(--assessment-bg)";
                const color = isCurrent ? WHITE : isAns ? "#16a34a" : TEXT_MUTED;
                const border = isCurrent ? `1px solid ${DARK}` : isAns ? "1px solid rgba(22, 163, 74, 0.3)" : "1px solid transparent";
                return (
                  <button key={q.id} onClick={() => setCurrentQ(i)} style={{ width: "100%", aspectRatio: "1", borderRadius: 8, border, backgroundColor: bg, color, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
            {[{ bg: DARK, border: `1px solid ${DARK}`, color: WHITE, label: "Current" }, { bg: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(22, 163, 74, 0.3)", color: "#16a34a", label: "Answered" }, { bg: "var(--assessment-bg)", border: "1px solid transparent", color: TEXT_MUTED, label: "Unanswered" }].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: item.bg, border: item.border, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto" }}>
            <button type="button" onClick={() => void handleComplete()} disabled={submitting} style={{ width: "100%", padding: "12px 0", backgroundColor: submitting ? "#94a3b8" : DARK, color: WHITE, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", transition: "opacity 0.15s" }}>
              {submitting ? "Submitting…" : "Submit Quiz"}
            </button>
            <p style={{ fontSize: 11, color: TEXT_LIGHT, textAlign: "center", margin: "8px 0 0 0" }}>{answered}/{total} answered</p>
          </div>
        </div>
      </div>

    </div>
  );
}