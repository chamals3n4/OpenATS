"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon, Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import {
  useCreateAssignment,
  useUpdateAssignment,
  type AssignmentInput,
} from "@/hooks/queries/use-assignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Assignment, AssignmentResource, SubmissionField, SubmissionFieldType } from "@/types";
import { AssignmentPreview } from "./assignment-preview";

const MAX_RESOURCES = 10;
const MAX_FIELDS = 10;

const FIELD_TYPES: { value: SubmissionFieldType; label: string }[] = [
  { value: "link", label: "Link" },
  { value: "short_text", label: "Short answer" },
  { value: "long_text", label: "Long answer" },
];

/** What a new assignment starts with: a link to the work, and optional notes. */
const DEFAULT_FIELDS: SubmissionField[] = [
  { id: "link", label: "Link to your work", type: "link", required: true, hint: "A repository or a live demo" },
  { id: "notes", label: "Notes", type: "long_text", required: false, hint: "Anything we should know, such as how to run it" },
];

const newFieldId = () => `f${Math.random().toString(36).slice(2, 8)}`;
const BACK = "/assessments?tab=assignments";
const fieldCls =
  "rounded-md border-slate-300 bg-gray-100 shadow-none dark:border-neutral-600 dark:bg-neutral-800";

const isWebUrl = (value: string) => /^https?:\/\//i.test(value.trim());

/** The page for a new assignment (`assignment` null) and for editing one. */
export function AssignmentFormPage({ assignment }: { assignment: Assignment | null }) {
  const uid = useId();
  const router = useRouter();
  const [title, setTitle] = useState(assignment?.title ?? "");
  const [description, setDescription] = useState(assignment?.description ?? "");
  const [dueDays, setDueDays] = useState(String(assignment?.dueDays ?? 7));
  const [resources, setResources] = useState<AssignmentResource[]>(assignment?.resources ?? []);
  const [fields, setFields] = useState<SubmissionField[]>(assignment?.submissionFields ?? DEFAULT_FIELDS);

  const create = useCreateAssignment();
  const update = useUpdateAssignment(assignment?.id ?? 0);
  const isPending = create.isPending || update.isPending;

  const setResource = (index: number, patch: Partial<AssignmentResource>) =>
    setResources((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const setField = (index: number, patch: Partial<SubmissionField>) =>
    setFields((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const moveField = (index: number, by: -1 | 1) =>
    setFields((list) => {
      const target = index + by;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const handleSave = () => {
    const days = Number(dueDays);
    if (!title.trim()) return toast.warning("Give the assignment a title.");
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      return toast.warning("Days to hand in must be a whole number, from 1 to 90.");
    }
    const kept = resources
      .map((r) => ({ label: r.label.trim(), url: r.url.trim() }))
      .filter((r) => r.label || r.url);
    if (kept.some((r) => !r.label || !isWebUrl(r.url))) {
      return toast.warning("Each link needs a name and a web address starting with http:// or https://.");
    }

    if (fields.length === 0) return toast.warning("Add at least one field to the hand-in form.");
    if (fields.some((f) => !f.label.trim())) return toast.warning("Give every hand-in field a label.");
    const cleanedFields = fields.map((f) => {
      const hint = f.hint?.trim();
      return { id: f.id, label: f.label.trim(), type: f.type, required: f.required, ...(hint ? { hint } : {}) };
    });

    const input: AssignmentInput = {
      title: title.trim(),
      description,
      resources: kept,
      submissionFields: cleanedFields,
      dueDays: days,
    };
    const options = {
      onSuccess: () => {
        toast.success(assignment ? "Assignment updated" : "Assignment created");
        router.push(BACK);
      },
      onError: (error: Error) => toast.error(error.message || "Failed to save the assignment"),
    };
    if (assignment) update.mutate(input, options);
    else create.mutate(input, options);
  };

  return (
    // Full height so the header stays and the two panels scroll
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-neutral-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-300 px-4 py-4 sm:px-8 dark:border-neutral-700">
        <div className="min-w-0">
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            {assignment ? "Edit assignment" : "New assignment"}
          </p>
          <h1 className="mt-0.5 truncate text-xl font-semibold leading-tight text-slate-900 dark:text-neutral-100">
            {title.trim() || "Untitled assignment"}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="cancel" render={<Link href={BACK} />} className="h-9 cursor-pointer px-4 text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="h-9 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover disabled:opacity-70"
          >
            {isPending && <Spinner className="size-4" />}
            {isPending ? "Saving" : "Save assignment"}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
        <section className="space-y-5 p-4 sm:p-8 lg:overflow-y-auto lg:border-r lg:border-slate-300 dark:lg:border-neutral-700">
          <div>
            <Label htmlFor={`${uid}-title`} className="mb-1.5 block text-sm font-medium">
              Title
            </Label>
            <Input
              id={`${uid}-title`}
              autoFocus={!assignment}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build a small job board"
              maxLength={255}
              className={`h-10 ${fieldCls}`}
            />
          </div>

          <div>
            <Label htmlFor={`${uid}-description`} className="mb-1.5 block text-sm font-medium">
              Brief and requirements
            </Label>
            <Textarea
              id={`${uid}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={"What should they build?\nWhich stack, what to include, how it will be judged."}
              rows={12}
              className={`resize-y ${fieldCls}`}
            />
          </div>

          <div className="w-52">
            <Label htmlFor={`${uid}-due`} className="mb-1.5 block text-sm font-medium">
              Days to hand in
            </Label>
            <Input
              id={`${uid}-due`}
              type="number"
              min="1"
              max="90"
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
              className={`h-10 ${fieldCls}`}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
              Counted from when you send it. After that the link stops accepting work.
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="text-sm font-medium">
                Resource links <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              {resources.length < MAX_RESOURCES && (
                <Button
                  type="button"
                  variant="cancel"
                  className="h-8 gap-1.5 px-2.5 text-xs"
                  onClick={() => setResources((list) => [...list, { label: "", url: "" }])}
                >
                  <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                  Add link
                </Button>
              )}
            </div>
            <p className="mb-2 text-xs text-slate-500 dark:text-neutral-400">
              A spec document, a design, or a starter repository. Paste a shared link; files are not uploaded here.
            </p>
            <div className="space-y-2">
              {resources.map((resource, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={resource.label}
                    onChange={(e) => setResource(index, { label: e.target.value })}
                    placeholder="Name"
                    maxLength={120}
                    aria-label={`Link ${index + 1} name`}
                    className={`h-9 w-36 shrink-0 ${fieldCls}`}
                  />
                  <Input
                    value={resource.url}
                    onChange={(e) => setResource(index, { url: e.target.value })}
                    placeholder="https://"
                    aria-label={`Link ${index + 1} address`}
                    className={`h-9 min-w-0 flex-1 ${fieldCls}`}
                  />
                  <Button
                    type="button"
                    variant="cancel"
                    className="h-9 shrink-0 px-2.5"
                    aria-label={`Remove link ${index + 1}`}
                    onClick={() => setResources((list) => list.filter((_, i) => i !== index))}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="text-sm font-medium">Hand-in form</Label>
              {fields.length < MAX_FIELDS && (
                <Button
                  type="button"
                  variant="cancel"
                  className="h-8 gap-1.5 px-2.5 text-xs"
                  onClick={() =>
                    setFields((list) => [
                      ...list,
                      { id: newFieldId(), label: "", type: "short_text", required: false },
                    ])
                  }
                >
                  <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                  Add field
                </Button>
              )}
            </div>
            <p className="mb-2 text-xs text-slate-500 dark:text-neutral-400">
              What the candidate fills in to hand in their work. Each assignment keeps the form it was sent with, so
              changing this later does not affect assignments already sent.
            </p>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-2 rounded-md border border-slate-300 p-3 dark:border-neutral-700"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={field.label}
                      onChange={(e) => setField(index, { label: e.target.value })}
                      placeholder="Label, e.g. Link to your repository"
                      maxLength={120}
                      aria-label={`Field ${index + 1} label`}
                      className={`h-9 min-w-0 flex-1 ${fieldCls}`}
                    />
                    <Select
                      items={FIELD_TYPES}
                      value={field.type}
                      onValueChange={(value) => value && setField(index, { type: value as SubmissionFieldType })}
                    >
                      <SelectTrigger
                        aria-label={`Field ${index + 1} type`}
                        className="w-40 shrink-0 rounded-md border-slate-300 data-[size=default]:h-9 bg-gray-100 shadow-none dark:border-neutral-600 dark:bg-neutral-800"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-sm">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    value={field.hint ?? ""}
                    onChange={(e) => setField(index, { hint: e.target.value })}
                    placeholder="Help text under the field (optional)"
                    maxLength={200}
                    aria-label={`Field ${index + 1} help text`}
                    className={`h-9 ${fieldCls}`}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-neutral-300">
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(checked) => setField(index, { required: checked === true })}
                      />
                      Required
                    </label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="cancel"
                        className="h-8 px-2"
                        disabled={index === 0}
                        aria-label={`Move field ${index + 1} up`}
                        onClick={() => moveField(index, -1)}
                      >
                        <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="cancel"
                        className="h-8 px-2"
                        disabled={index === fields.length - 1}
                        aria-label={`Move field ${index + 1} down`}
                        onClick={() => moveField(index, 1)}
                      >
                        <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="cancel"
                        className="h-8 px-2"
                        disabled={fields.length === 1}
                        aria-label={`Remove field ${index + 1}`}
                        onClick={() => setFields((list) => list.filter((_, i) => i !== index))}
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="min-w-0 bg-slate-50 p-4 sm:p-8 lg:overflow-y-auto dark:bg-neutral-900/40">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">
            Preview: what the candidate sees
          </p>
          <AssignmentPreview
            title={title}
            description={description}
            resources={resources.filter((r) => r.label.trim() || r.url.trim())}
            submissionFields={fields}
            dueDays={Number(dueDays)}
          />
        </section>
      </div>
    </div>
  );
}
