"use client";

import { useState } from "react";
import type { Ref } from "react";
import Link from "next/link";
import {
  PlusSignIcon,
  Delete02Icon,
  DragDropVerticalIcon,
  RadioButtonIcon,
  CheckmarkCircle01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  TickDouble01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDragSort } from "@/hooks/use-drag-sort";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type QuestionType = "Multiple Choice" | "Short Answer" | "True/False";

interface AnswerOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

interface Question {
  uid: number;
  title: string;
  description: string;
  type: QuestionType;
  points: string;
  options: AnswerOption[];
  shortAnswerKey: string;
}

let idCounter = 10;

const makeOption = (text: string): AnswerOption => ({
  id: ++idCounter,
  text,
  isCorrect: false,
});

const makeQuestion = (idx: number): Question => ({
  uid: ++idCounter,
  title: "",
  description: "",
  type: "Multiple Choice",
  points: "",
  options: [
    makeOption("Option 1"),
    makeOption("Option 2"),
    makeOption("Option 3"),
  ],
  shortAnswerKey: "",
});

const TRUE_FALSE_OPTIONS: AnswerOption[] = [
  { id: -1, text: "True", isCorrect: false },
  { id: -2, text: "False", isCorrect: false },
];

const inputCls =
  "h-11 bg-white border-slate-200 rounded-lg shadow-none text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:border-slate-400 transition-colors";

const textareaCls =
  "w-full px-3.5 py-3 text-sm bg-white border border-slate-200 rounded-lg shadow-none placeholder:text-slate-400 focus:outline-none focus:border-slate-400 resize-none transition-colors";

export default function CreateAssessmentPage() {
  const [isActive, setIsActive] = useState(true);
  const [metaOpen, setMetaOpen] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDesc, setAssessmentDesc] = useState("");
  const [timeLimit, setTimeLimit] = useState("120");
  const [totalPoints, setTotalPoints] = useState("100");
  const [questions, setQuestions] = useState<Question[]>([makeQuestion(0)]);
  const [selectedQ, setSelectedQ] = useState(0);

  function moveItem<T>(list: T[], from: number, to: number): T[] {
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  const addQuestion = () => {
    const q = makeQuestion(questions.length);
    setQuestions((prev) => [...prev, q]);
    setSelectedQ(questions.length);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length === 1) return; // keep at least one
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setSelectedQ((s) => Math.max(0, s >= idx ? s - 1 : s));
  };

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  };

  const changeType = (idx: number, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        let options = q.options;
        if (type === "True/False") {
          options = TRUE_FALSE_OPTIONS.map((o) => ({ ...o }));
        } else if (q.type === "True/False") {
          // switching away from T/F — restore defaults
          options = [
            makeOption("Option 1"),
            makeOption("Option 2"),
            makeOption("Option 3"),
          ];
        }
        return { ...q, type, options };
      }),
    );
  };

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: [
                ...q.options,
                makeOption(`Option ${q.options.length + 1}`),
              ],
            }
          : q,
      ),
    );
  };

  const removeOption = (qIdx: number, optId: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.filter((o) => o.id !== optId) }
          : q,
      ),
    );
  };

  const updateOptionText = (qIdx: number, optId: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optId ? { ...o, text } : o,
              ),
            }
          : q,
      ),
    );
  };

  const toggleCorrect = (qIdx: number, optId: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const options = q.options.map((o) => ({
          ...o,
          isCorrect: o.id === optId ? !o.isCorrect : false,
        }));
        return { ...q, options };
      }),
    );
  };

  const currentQ = questions[selectedQ];

  const isTrueFalse = currentQ?.type === "True/False";
  const isShortAnswer = currentQ?.type === "Short Answer";

  const correctLabel = currentQ?.options.find((o) => o.isCorrect)?.text ?? null;

  return (
    <div className="flex flex-1 flex-col bg-white overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <h1 className="text-[22px] font-semibold text-slate-900 leading-none whitespace-nowrap">
            Create New Assessment
          </h1>
          <div className="flex items-center gap-2.5">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-[var(--theme-color)]"
            />
            <span className="text-sm text-slate-600 font-medium whitespace-nowrap">
              Make this Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white h-10 px-6 rounded-lg shadow-none border-none font-medium text-sm transition-all active:scale-[0.98]"
            onClick={() => {
              console.log({
                assessmentTitle,
                assessmentDesc,
                timeLimit,
                totalPoints,
                isActive,
                questions,
              });
              alert("Assessment saved (mock)!");
            }}
          >
            Save Assessment
          </Button>
          <Link href="assessments">
            <Button
              variant="outline"
              className="h-10 px-6 rounded-lg border-slate-200 text-slate-600 bg-white hover:bg-slate-50 shadow-none font-medium text-sm"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </div>

      <div className="border-b border-slate-100 shrink-0">
        <button
          onClick={() => setMetaOpen((o) => !o)}
          className="w-full flex items-center justify-between px-8 py-4 hover:bg-slate-50/60 transition-colors group"
        >
          <span className="text-[12px] font-semibold text-slate-500 tracking-widest uppercase">
            Assessment Details
          </span>
          <HugeiconsIcon
            icon={metaOpen ? ArrowUp01Icon : ArrowDown01Icon}
            className="size-4 text-slate-400 group-hover:text-slate-600 transition-colors"
            strokeWidth={2}
          />
        </button>

        {metaOpen && (
          <div className="px-8 pb-8 space-y-5">
            <div>
              <Label className="text-[13px] font-medium text-slate-600 mb-1.5 block">
                Assessment Title
              </Label>
              <Input
                placeholder="e.g., Frontend Developer Assessment"
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <Label className="text-[13px] font-medium text-slate-600 mb-1.5 block">
                Description
              </Label>
              <textarea
                placeholder="Describe what this assessment is for ..."
                rows={3}
                value={assessmentDesc}
                onChange={(e) => setAssessmentDesc(e.target.value)}
                className={textareaCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="text-[13px] font-medium text-slate-600 mb-1.5 block">
                  Time Limit (Minutes)
                </Label>
                <Input
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium text-slate-600 mb-1.5 block">
                  Total Points
                </Label>
                <Input
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[280px] border-r border-slate-100 flex flex-col shrink-0 bg-white">
          <div className="px-5 py-4 border-b border-slate-100">
            <span className="text-[13px] font-semibold text-slate-700">
              Questions ({questions.length})
            </span>
          </div>

          <div className="p-4">
            <Button
              onClick={addQuestion}
              className="w-full bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white h-10 rounded-lg shadow-none border-none font-medium text-sm gap-2 transition-all active:scale-[0.98]"
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                className="size-4"
                strokeWidth={2.5}
              />
              Add Question
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {questions.map((q, idx) => {
              const hasCorrect =
                q.options.some((o) => o.isCorrect) ||
                (q.type === "Short Answer" && q.shortAnswerKey.trim());
              function DraggableQItem() {
                const { ref, isDragging, isOver } = useDragSort({
                  id: q.uid,
                  index: idx,
                  type: "ASSESSMENT_QUESTION",
                  onMove: (from, to) => {
                    setQuestions((prev) => moveItem(prev, from, to));
                    setSelectedQ(to);
                  },
                });
                return (
                  <div
                    ref={ref as Ref<HTMLDivElement>}
                    className={`w-full text-left rounded-lg px-3.5 py-3 flex items-center gap-3 transition-all border cursor-pointer ${
                      isDragging
                        ? "opacity-40 border-transparent bg-slate-100"
                        : isOver
                          ? "border-[var(--theme-color)]/30 bg-[var(--theme-color)]/5"
                          : selectedQ === idx
                            ? "bg-[var(--theme-color)]/5 border-[var(--theme-color)]/20"
                            : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setSelectedQ(idx)}
                  >
                    <HugeiconsIcon
                      icon={DragDropVerticalIcon}
                      className="size-4 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[13px] font-semibold truncate ${selectedQ === idx ? "text-[var(--theme-color)]" : ""}`}
                      >
                        Q{idx + 1}: {q.title || "Question Title"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {q.type}
                      </p>
                    </div>
                    {hasCorrect && (
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        className="size-4 text-emerald-500 shrink-0"
                      />
                    )}
                  </div>
                );
              }
              return <DraggableQItem key={q.uid} />;
            })}
          </div>
        </div>

        {currentQ && (
          <div className="flex-1 overflow-y-auto p-8 space-y-5 bg-white">
            <div className="border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-700">
                  Question Details
                </span>
                <button
                  onClick={() => removeQuestion(selectedQ)}
                  disabled={questions.length === 1}
                  className="text-slate-300 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove question"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </button>
              </div>

              <div>
                <Label className="text-[13px] font-medium text-slate-600 mb-1.5 block">
                  Question Title
                </Label>
                <Input
                  placeholder="What is your question?"
                  value={currentQ.title}
                  onChange={(e) =>
                    updateQuestion(selectedQ, { title: e.target.value })
                  }
                  className={inputCls}
                />
              </div>

              <div>
                <Label className="text-[13px] font-medium text-slate-600 mb-1.5 block">
                  Description{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <textarea
                  placeholder="Add more context for this question ..."
                  rows={2}
                  value={currentQ.description}
                  onChange={(e) =>
                    updateQuestion(selectedQ, { description: e.target.value })
                  }
                  className={textareaCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <Label className="text-[13px] font-medium text-slate-600 mb-1.5 block">
                    Question Type
                  </Label>
                  <Select
                    value={currentQ.type}
                    onValueChange={(val) =>
                      changeType(selectedQ, val as QuestionType)
                    }
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200 rounded-lg shadow-none text-sm focus:ring-0 focus:border-slate-400 gap-2 transition-colors">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={RadioButtonIcon}
                          className="size-4 text-slate-400 shrink-0"
                        />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-slate-200">
                      <SelectItem value="Multiple Choice">
                        Multiple Choice
                      </SelectItem>
                      <SelectItem value="Short Answer">Short Answer</SelectItem>
                      <SelectItem value="True/False">True / False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-slate-600 mb-1.5 block">
                    Points
                  </Label>
                  <Select
                    value={currentQ.points}
                    onValueChange={(val) =>
                      updateQuestion(selectedQ, { points: val || "" })
                    }
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-200 rounded-lg shadow-none text-sm focus:ring-0 focus:border-slate-400 transition-colors">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-slate-200">
                      <SelectItem value="5">5 pts</SelectItem>
                      <SelectItem value="10">10 pts</SelectItem>
                      <SelectItem value="15">15 pts</SelectItem>
                      <SelectItem value="20">20 pts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {isShortAnswer ? (
              <div className="border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="text-[13px] font-semibold text-slate-700">
                  Correct Answer (Key)
                </h3>
                <p className="text-[12px] text-slate-400">
                  Candidates' answers will be compared against this key for
                  grading.
                </p>
                <textarea
                  placeholder="Type the correct answer here ..."
                  rows={3}
                  value={currentQ.shortAnswerKey}
                  onChange={(e) =>
                    updateQuestion(selectedQ, {
                      shortAnswerKey: e.target.value,
                    })
                  }
                  className={textareaCls}
                />
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-slate-700">
                    Answer Options
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Click {isTrueFalse ? "True or False" : "the circle"} to mark
                    correct answer
                  </span>
                </div>

                <div className="space-y-3">
                  {currentQ.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-3 border rounded-lg px-4 py-3 transition-all ${
                        opt.isCorrect
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <button
                        onClick={() => toggleCorrect(selectedQ, opt.id)}
                        title="Mark as correct answer"
                        className="shrink-0 transition-colors"
                      >
                        <HugeiconsIcon
                          icon={
                            opt.isCorrect
                              ? CheckmarkCircle01Icon
                              : RadioButtonIcon
                          }
                          className={`size-5 transition-colors ${opt.isCorrect ? "text-emerald-500" : "text-slate-300 hover:text-slate-500"}`}
                        />
                      </button>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) =>
                          updateOptionText(selectedQ, opt.id, e.target.value)
                        }
                        disabled={isTrueFalse}
                        className={`flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 ${
                          opt.isCorrect
                            ? "text-emerald-700 font-medium"
                            : "text-slate-700"
                        } disabled:cursor-default`}
                      />

                      {opt.isCorrect && (
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                          Correct
                        </span>
                      )}

                      {!isTrueFalse && (
                        <button
                          onClick={() => removeOption(selectedQ, opt.id)}
                          disabled={currentQ.options.length <= 2}
                          className="text-slate-300 hover:text-red-400 transition-colors p-0.5 rounded shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-4"
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!isTrueFalse && (
                  <Button
                    onClick={() => addOption(selectedQ)}
                    variant="outline"
                    className="h-9 px-4 border-[var(--theme-color)] text-[var(--theme-color)] hover:bg-[var(--theme-color)]/5 rounded-lg shadow-none text-[13px] font-medium transition-all"
                  >
                    <HugeiconsIcon
                      icon={PlusSignIcon}
                      className="size-3.5 mr-1.5"
                      strokeWidth={2.5}
                    />
                    Add Answer Option
                  </Button>
                )}

                {correctLabel && (
                  <div className="flex items-center gap-2 pt-1">
                    <HugeiconsIcon
                      icon={TickDouble01Icon}
                      className="size-4 text-emerald-500"
                    />
                    <span className="text-[12px] text-emerald-600 font-medium">
                      Correct answer set to: <strong>{correctLabel}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
