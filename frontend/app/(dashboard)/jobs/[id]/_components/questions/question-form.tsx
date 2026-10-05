"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { FormField, inputCls } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MIN_OPTIONS,
  OPTION_MAX,
  POINTS_MAX,
  emptyOption,
  isScored,
  type OptionDraft,
  QUESTION_TYPES,
  TITLE_MAX,
  hasQuestionErrors,
  isChoiceType,
  toApiOptions,
  validateQuestion,
  type QuestionType,
} from "../../lib/question-utils";

export interface QuestionValues {
  title: string;
  questionType: QuestionType;
  isRequired: boolean;
  /** Only meaningful for the two choice types. */
  options: ReturnType<typeof toApiOptions>;
}

interface QuestionFormProps {
  mode: "add" | "edit";
  initial: { title: string; type: QuestionType; required: boolean; options: OptionDraft[] };
  isPending: boolean;
  onSubmit: (values: QuestionValues) => void;
  onCancel: () => void;
}

const selectTriggerCls =
  "h-10! w-full rounded-md border border-slate-300 bg-gray-100 px-3! py-0! text-sm text-slate-900 shadow-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

const padOptions = (options: OptionDraft[]) => {
  const padded = [...options];
  while (padded.length < MIN_OPTIONS) padded.push(emptyOption());
  return padded;
};

/**
 * The form body for both adding and editing a question. Mount it only while its dialog is
 * open, so every open starts from fresh values.
 */
export function QuestionForm({ mode, initial, isPending, onSubmit, onCancel }: QuestionFormProps) {
  const [title, setTitle] = useState(initial.title);
  const [type, setType] = useState<QuestionType>(initial.type);
  const [required, setRequired] = useState(initial.required);
  const [options, setOptions] = useState<OptionDraft[]>(() => padOptions(initial.options));
  const [showErrors, setShowErrors] = useState(false);
  // Which option row should take focus once it has rendered (a row added with Enter).
  const focusOption = useRef<number | null>(null);
  const optionInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (focusOption.current === null) return;
    optionInputs.current[focusOption.current]?.focus();
    focusOption.current = null;
  }, [options]);

  const errors = validateQuestion({ title, type, options: options.map((o) => o.label) });
  const isChoice = isChoiceType(type);

  const patchOption = (index: number, patch: Partial<OptionDraft>) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  const addOption = (afterIndex = options.length - 1) => {
    focusOption.current = afterIndex + 1;
    setOptions((prev) => [...prev.slice(0, afterIndex + 1), emptyOption(), ...prev.slice(afterIndex + 1)]);
  };

  const removeOption = (index: number) =>
    setOptions((prev) => prev.filter((_, i) => i !== index));

  const handleType = (next: QuestionType) => {
    setType(next);
    // Switching to a choice type: make sure there are rows to fill in.
    if (isChoiceType(next)) setOptions((prev) => padOptions(prev));
  };

  const submit = () => {
    setShowErrors(true);
    if (hasQuestionErrors(errors)) return;
    onSubmit({
      title: title.trim(),
      questionType: type,
      isRequired: required,
      options: isChoice ? toApiOptions(options) : [],
    });
  };

  const typeItems = QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label }));
  const typeHint = QUESTION_TYPES.find((t) => t.value === type)?.hint;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isPending) submit();
      }}
    >
      <div className="space-y-4 px-5 py-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            {mode === "add" ? "New question" : "Edit question"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
            {mode === "add"
              ? "Choose how candidates answer, then write the question they will see."
              : "Changes apply to the application form straight away."}
          </DialogDescription>
        </DialogHeader>

        <FormField
          label="Question"
          htmlFor="question-title"
          required
          error={showErrors ? errors.title : null}
          hint={`The candidate sees this when applying. ${title.trim().length}/${TITLE_MAX}`}
        >
          <Input
            id="question-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. What is your GitHub profile?"
            className={inputCls}
          />
        </FormField>

        <div className="grid items-start gap-4 sm:grid-cols-2">
          <FormField label="Answer type" htmlFor="question-type" hint={typeHint}>
            <Select
              items={typeItems}
              value={type}
              onValueChange={(v) => v && handleType(v as QuestionType)}
            >
              <SelectTrigger id="question-type" className={selectTriggerCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeItems.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800 dark:text-neutral-200">
              Rules
            </span>
            <div className="flex h-10 items-center gap-2.5 rounded-md border border-slate-300 px-3 dark:border-neutral-600">
              <Checkbox
                id="question-required"
                variant="theme"
                checked={required}
                onCheckedChange={(v) => setRequired(!!v)}
              />
              <Label
                htmlFor="question-required"
                className="cursor-pointer text-sm font-normal text-slate-800 dark:text-neutral-200"
              >
                Candidates must answer this
              </Label>
            </div>
          </div>
        </div>

        {isChoice && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-800 dark:text-neutral-200">
              Options <span className="ml-0.5 text-red-600">*</span>
            </legend>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              What candidates choose from. Add at least {MIN_OPTIONS}. Give an option points to
              score the answer, or mark it knockout to flag candidates who pick it.
            </p>

            <ul className="space-y-2">
              {options.map((option, i) => {
                const optionError = showErrors ? errors.optionErrors[i] : undefined;
                return (
                  <li key={i}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        aria-label={`Option ${i + 1}`}
                        ref={(el) => {
                          optionInputs.current[i] = el;
                        }}
                        value={option.label}
                        maxLength={OPTION_MAX}
                        onChange={(e) => patchOption(i, { label: e.target.value })}
                        onKeyDown={(e) => {
                          // Enter moves on to the next option instead of submitting the form.
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (option.label.trim()) addOption(i);
                          }
                        }}
                        placeholder={`Option ${i + 1}`}
                        className={`${inputCls} min-w-48 flex-1`}
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={POINTS_MAX}
                        aria-label={`Points for option ${i + 1}`}
                        title="Points"
                        value={option.points}
                        onChange={(e) => patchOption(i, { points: Number(e.target.value) })}
                        className={`${inputCls} w-20 shrink-0`}
                      />
                      <span className="-ml-1 text-sm text-slate-500 dark:text-neutral-400">pts</span>
                      <div className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 dark:border-neutral-600">
                        <Checkbox
                          id={`option-knockout-${i}`}
                          variant="theme"
                          checked={option.isKnockout}
                          onCheckedChange={(v) => patchOption(i, { isKnockout: !!v })}
                        />
                        <Label
                          htmlFor={`option-knockout-${i}`}
                          className="cursor-pointer text-sm font-normal text-slate-800 dark:text-neutral-200"
                        >
                          Knockout
                        </Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Remove option ${i + 1}`}
                        title="Remove"
                        disabled={options.length <= MIN_OPTIONS}
                        onClick={() => removeOption(i)}
                        className="size-9 shrink-0 rounded-md p-0 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                    {optionError && (
                      <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                        {optionError}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            {!isScored(options) && (
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                No points yet, so this question will not count toward the candidate&apos;s score.
              </p>
            )}

            {showErrors && errors.options && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {errors.options}
              </p>
            )}

            <Button
              type="button"
              variant="cancel"
              onClick={() => addOption()}
              className="h-9 gap-2 border-dashed px-3.5 text-sm"
            >
              <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
              Add option
            </Button>
          </fieldset>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-300 bg-slate-50 px-5 py-3.5 dark:border-neutral-700 dark:bg-neutral-950/50">
        <Button
          type="button"
          variant="cancel"
          onClick={onCancel}
          disabled={isPending}
          className="h-9 px-4 text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
        >
          {isPending && <Spinner className="size-3.5" />}
          {isPending
            ? mode === "add"
              ? "Adding"
              : "Saving"
            : mode === "add"
              ? "Add question"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

interface QuestionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Rendered only while open. */
  children: React.ReactNode;
}

/** A wide dialog with no open animation, kept inside the window on short screens. */
export function QuestionDialog({ open, onClose, children }: QuestionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-xl border-slate-200 bg-white p-0 duration-0 sm:max-w-[960px] dark:border-neutral-800 dark:bg-neutral-900"
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
