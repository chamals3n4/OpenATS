"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { FormField, inputCls } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serverFetch } from "@/lib/auth-action";
import {
  EMPLOYMENT_LABELS,
  OFFER_FIELD_LABELS,
  getMissingFields,
  type EmploymentType,
  type OfferFieldKey,
  type OfferFormValues,
} from "../../lib/offer-utils";
import { OfferLetterDialog } from "./offer-letter-dialog";
import type { Offer, Template } from "@/types";

const CURRENCIES = ["USD", "EUR", "GBP", "LKR", "INR", "AUD"].map((c) => ({
  value: c,
  label: c,
}));
const EMPLOYMENT_ITEMS = Object.entries(EMPLOYMENT_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const selectTriggerCls =
  "h-10! w-full rounded-md border border-slate-300 bg-gray-100 px-3! py-0! text-sm text-slate-900 shadow-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

interface OfferEditFormProps {
  offer: Offer;
  candidateId: number;
  candidateName: string;
  initialValues: OfferFormValues;
  emailTemplates: Template[];
  /** Show the validation errors straight away, e.g. after a failed "Send" from the summary. */
  showErrorsInitially?: boolean;
  isSaving: boolean;
  isSending: boolean;
  onCancel: () => void;
  onSave: (values: OfferFormValues) => void;
  onSend: (values: OfferFormValues) => void;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 border-t border-slate-300 px-5 py-5 first:border-t-0 dark:border-neutral-700">
      <div>
        <h4 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
          {title}
        </h4>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function OfferEditForm({
  offer,
  candidateId,
  candidateName,
  initialValues,
  emailTemplates,
  showErrorsInitially = false,
  isSaving,
  isSending,
  onCancel,
  onSave,
  onSend,
}: OfferEditFormProps) {
  const uid = useId();
  const [values, setValues] = useState<OfferFormValues>(initialValues);
  const [showErrors, setShowErrors] = useState(showErrorsInitially);
  const [showSource, setShowSource] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);

  const set = <K extends keyof OfferFormValues>(key: K, value: OfferFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const missing = new Set(getMissingFields(values));
  const errorFor = (key: OfferFieldKey) =>
    showErrors && missing.has(key) ? `${OFFER_FIELD_LABELS[key]} is required to send.` : null;

  const busy = isSaving || isSending;
  const isDraft = offer.status === "draft";

  const templateItems = [
    { value: "", label: "No template" },
    ...emailTemplates.map((t) => ({ value: String(t.id), label: t.name })),
  ];

  const handleSend = () => {
    setShowErrors(true);
    if (missing.size > 0) {
      toast.error("Fill in the highlighted fields before sending.");
      return;
    }
    onSend(values);
  };

  const handleGenerate = async () => {
    if (!values.templateId) return;
    setIsGenerating(true);
    try {
      const res = await serverFetch<{ data: { subject: string; html: string } }>(
        `/templates/${values.templateId}/preview`,
        { method: "POST", body: JSON.stringify({ candidateId }) },
      );
      set("offerLetterHtml", res.data.html);
      toast.success("Letter generated from the template");
    } catch {
      toast.error("Could not generate the letter from this template");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            {isDraft ? "Edit offer" : "Edit sent offer"}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            {isDraft
              ? "Fields marked * are needed before the offer can be sent."
              : "The candidate already has this offer. Changes are saved but not re-sent."}
          </p>
        </div>
        {values.offerLetterHtml.trim() && (
          <Button
            type="button"
            variant="cancel"
            onClick={() => setLetterOpen(true)}
            className="h-9 gap-2 px-3.5 text-sm"
          >
            <HugeiconsIcon icon={File01Icon} className="size-4" strokeWidth={1.75} />
            View offer letter
          </Button>
        )}
      </header>
      <OfferLetterDialog
        open={letterOpen}
        onOpenChange={setLetterOpen}
        html={values.offerLetterHtml}
        candidateName={candidateName}
      />

      <Section title="Compensation" description="What the candidate will be paid.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Salary" htmlFor={`${uid}-salary`} required error={errorFor("salary")}>
            <div className="flex gap-2">
              <Select
                items={CURRENCIES}
                value={values.currency}
                onValueChange={(v) => set("currency", v ?? "USD")}
              >
                <SelectTrigger className={`${selectTriggerCls} w-24! shrink-0`} aria-label="Currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id={`${uid}-salary`}
                type="number"
                min={0}
                value={values.salary}
                onChange={(e) => set("salary", e.target.value)}
                placeholder="75000"
                className={`${inputCls} flex-1`}
              />
            </div>
          </FormField>

          <FormField label="Employment type" htmlFor={`${uid}-type`} required>
            <Select
              items={EMPLOYMENT_ITEMS}
              value={values.employmentType}
              onValueChange={(v) => set("employmentType", (v ?? "full_time") as EmploymentType)}
            >
              <SelectTrigger id={`${uid}-type`} className={selectTriggerCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_ITEMS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </Section>

      <Section title="Role details" description="When and where the candidate starts.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start date" htmlFor={`${uid}-start`} required error={errorFor("startDate")}>
            <Input
              id={`${uid}-start`}
              type="date"
              value={values.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className={inputCls}
            />
          </FormField>
          <FormField
            label="Reporting manager"
            htmlFor={`${uid}-manager`}
            required
            error={errorFor("reportingManager")}
          >
            <Input
              id={`${uid}-manager`}
              value={values.reportingManager}
              onChange={(e) => set("reportingManager", e.target.value)}
              placeholder="e.g. Jane Smith"
              className={inputCls}
            />
          </FormField>
        </div>
        <FormField label="Benefits" htmlFor={`${uid}-benefits`} required error={errorFor("benefits")}>
          <Textarea
            id={`${uid}-benefits`}
            value={values.benefits}
            onChange={(e) => set("benefits", e.target.value)}
            placeholder="e.g. Health insurance, 20 days paid leave, monthly allowance"
            className="min-h-24 resize-y border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </FormField>
      </Section>

      <Section
        title="Offer letter"
        description="Pick a template and generate the letter, then read it before sending."
      >
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Template" htmlFor={`${uid}-template`} className="min-w-56 flex-1">
            <Select
              items={templateItems}
              value={values.templateId}
              onValueChange={(v) => set("templateId", v ?? "")}
            >
              <SelectTrigger id={`${uid}-template`} className={selectTriggerCls}>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templateItems.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <Button
            type="button"
            variant="cancel"
            onClick={handleGenerate}
            disabled={!values.templateId || isGenerating}
            className="h-10 gap-2 px-4 text-sm"
          >
            {isGenerating && <Spinner className="size-3.5" />}
            {isGenerating ? "Generating" : "Generate letter"}
          </Button>
        </div>

        {errorFor("offerLetterHtml") && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            {errorFor("offerLetterHtml")}
          </p>
        )}

        <p className="rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-600 dark:border-neutral-700 dark:text-neutral-400">
          {values.offerLetterHtml.trim()
            ? "A letter is ready. Use View offer letter at the top to read it."
            : "No letter yet. Choose a template and select Generate letter."}
        </p>

        <div>
          <button
            type="button"
            onClick={() => setShowSource((s) => !s)}
            className="cursor-pointer text-sm font-medium text-slate-700 underline-offset-4 hover:underline dark:text-neutral-300"
          >
            {showSource ? "Hide HTML source" : "Edit HTML source"}
          </button>
          {showSource && (
            <Textarea
              aria-label="Offer letter HTML source"
              value={values.offerLetterHtml}
              onChange={(e) => set("offerLetterHtml", e.target.value)}
              placeholder="<p>Dear candidate...</p>"
              className="mt-2 min-h-48 resize-y border-slate-300 bg-gray-100 font-mono text-xs shadow-none dark:border-neutral-600 dark:bg-neutral-800"
            />
          )}
        </div>
      </Section>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-300 bg-slate-50 px-5 py-3.5 dark:border-neutral-700 dark:bg-neutral-950/50">
        <Button
          variant="cancel"
          onClick={onCancel}
          disabled={busy}
          className="h-9 px-4 text-sm"
        >
          Cancel
        </Button>
        <Button
          variant="cancel"
          onClick={() => onSave(values)}
          disabled={busy}
          className="h-9 gap-2 px-4 text-sm"
        >
          {isSaving && !isSending && <Spinner className="size-3.5" />}
          {isDraft ? "Save draft" : "Save changes"}
        </Button>
        {isDraft && (
          <Button
            onClick={handleSend}
            disabled={busy}
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            {isSending ? (
              <Spinner className="size-3.5" />
            ) : (
              <HugeiconsIcon icon={SentIcon} className="size-4 -rotate-45" strokeWidth={2} />
            )}
            {isSending ? "Sending" : "Send offer"}
          </Button>
        )}
      </footer>
    </section>
  );
}
