"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, PencilEdit01Icon, Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CandidateJobFitTab } from "@/components/candidate-job-fit-tab";
import { useCandidateDetailSheet } from "@/components/candidate-detail-sheet-context";
import {
  useCandidate,
  useJob,
  usePipeline,
  useTemplates,
  useUpdateOffer,
  useUpdateOfferStatus,
  useCandidateAssessments,
} from "@/hooks/use-api";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/time-ago";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** `<input type="date">` only accepts YYYY-MM-DD; API may return full ISO strings. */
function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymd) return ymd[1];
  const t = Date.parse(s);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const OFFER_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400" },
  sent: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400" },
  pending: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-600 dark:text-violet-400" },
  accepted: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600 dark:text-green-400" },
  declined: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-500 dark:text-red-400" },
  withdrawn: { bg: "bg-slate-50 dark:bg-neutral-800", text: "text-slate-500 dark:text-neutral-400" },
};

interface CandidateSidePanelProps {
  candidateId: number;
  /** When false, candidate detail is not fetched (e.g. sheet closed). */
  open?: boolean;
}

export function CandidateSidePanel({
  candidateId,
  open = true,
}: CandidateSidePanelProps) {
  const { data, isLoading } = useCandidate(candidateId, {
    enabled: open && !!candidateId,
  });
  const candidate = data?.data;
  const jobIdForOffer = data?.data?.jobId ?? 0;
  const { data: jobData } = useJob(jobIdForOffer);

  const { data: pipelineData } = usePipeline(candidate?.jobId ?? 0);
  const { data: assessmentsData } = useCandidateAssessments(candidateId);
  const { data: templatesRes } = useTemplates();
  const stageMap = useMemo(
    () => Object.fromEntries((pipelineData?.data ?? []).map((s) => [s.id, s.name])),
    [pipelineData],
  );

  const allTemplates = templatesRes?.data ?? [];
  const offerTemplates = useMemo(
    () => allTemplates.filter((t) => t.type === "offer"),
    [allTemplates],
  );

  const {
    setPreviewPane,
    emailSubject,
    setEmailSubject,
    emailBody,
    setEmailBody,
  } = useCandidateDetailSheet();

  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [editSalary, setEditSalary] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editPayFreq, setEditPayFreq] = useState("monthly");
  const [editStartDate, setEditStartDate] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editBenefits, setEditBenefits] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  /** Empty string or "__none__" resolved to null on save; otherwise numeric id string. */
  const [editTemplateId, setEditTemplateId] = useState("");
  const [activeTab, setActiveTab] = useState("job-fit");

  /** Label shown in the template Select trigger (resolved from full template list so the id never shows as the label). */
  const editTemplateSelectLabel = useMemo(() => {
    if (!editTemplateId || editTemplateId === "__none__") return "No template";
    const id = Number(editTemplateId);
    if (!Number.isFinite(id)) return "Select template";
    const t = allTemplates.find((x) => x.id === id);
    if (!t) return `Template #${id}`;
    return `${t.name}${t.isDefault ? " (default)" : ""}`;
  }, [editTemplateId, allTemplates]);

  const updateOfferMutation = useUpdateOffer();
  const updateOfferStatusMutation = useUpdateOfferStatus();
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (candidate?.offer?.status === "draft") setIsEditingOffer(false);
  }, [candidate?.offer?.id, candidate?.offer?.status]);

  useLayoutEffect(() => {
    const o = candidate?.offer;
    if (!o) return;
    setEditSalary(o.salary ? String(Number(o.salary)) : "");
    const cur = o.currency ? String(o.currency).trim().toUpperCase() : "";
    setEditCurrency(/^[A-Z]{3}$/.test(cur) ? cur : "USD");
    setEditPayFreq(o.payFrequency ?? "monthly");
    setEditStartDate(toDateInputValue(o.startDate));
    setEditExpiryDate(toDateInputValue(o.expiryDate));
    setEditBenefits(o.benefitsText ?? "");
    setEditStatus(o.status ?? "draft");
    setEditTemplateId(o.templateId != null ? String(o.templateId) : "");
  }, [candidate?.offer?.id, candidate?.offer?.templateId]);

  useEffect(() => {
    if (!candidate) return;
    if (candidate.resumeUrl) setPreviewPane("resume");
    else if (candidate.offer) setPreviewPane("offer");
    else setPreviewPane("email");
  }, [candidateId, candidate?.resumeUrl, candidate?.offer?.id]);

  useEffect(() => {
    if (activeTab === "email") setPreviewPane("email");
    else if (activeTab === "offer" && candidate?.offer) setPreviewPane("offer");
    else if (activeTab === "job-fit" && candidate?.resumeUrl)
      setPreviewPane("resume");
  }, [activeTab, candidate?.offer?.id, candidate?.resumeUrl]);

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = tabsScrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  };

  const openOfferEdit = () => {
    if (!offer) return;
    setEditSalary(offer.salary ? String(Number(offer.salary)) : "");
    const cur = offer.currency ? String(offer.currency).trim().toUpperCase() : "";
    setEditCurrency(/^[A-Z]{3}$/.test(cur) ? cur : "USD");
    setEditPayFreq(offer.payFrequency ?? "monthly");
    setEditStartDate(toDateInputValue(offer.startDate));
    setEditExpiryDate(toDateInputValue(offer.expiryDate));
    setEditBenefits(offer.benefitsText ?? "");
    setEditStatus(offer.status ?? "draft");
    setEditTemplateId(offer.templateId != null ? String(offer.templateId) : "");
    setIsEditingOffer(true);
  };

  const saveOffer = () => {
    if (!offer) return;
    const newStatus = editStatus as "draft" | "sent" | "pending" | "accepted" | "declined" | "withdrawn";

    const salaryTrim = editSalary.trim();
    let salaryNum: number | null = null;
    if (salaryTrim !== "") {
      salaryNum = Number(salaryTrim);
      if (Number.isNaN(salaryNum) || salaryNum < 0) {
        toast.error("Enter a valid salary or leave it empty.");
        return;
      }
      if (salaryNum === 0) {
        toast.error("Salary must be greater than zero, or leave it empty.");
        return;
      }
    }

    let templateIdResolved: number | null = null;
    if (editTemplateId && editTemplateId !== "__none__") {
      const tid = Number(editTemplateId);
      if (Number.isFinite(tid) && tid > 0) templateIdResolved = Math.trunc(tid);
    }

    const currencyTrim = editCurrency.trim().toUpperCase();
    const currencyOut = /^[A-Z]{3}$/.test(currencyTrim) ? currencyTrim : null;

    updateOfferMutation.mutate(
      {
        offerId: offer.id,
        data: {
          templateId: templateIdResolved,
          salary: salaryNum,
          currency: currencyOut,
          payFrequency: editPayFreq as "hourly" | "daily" | "weekly" | "monthly" | "yearly",
          startDate: editStartDate || null,
          expiryDate: editExpiryDate || null,
          benefitsText: editBenefits.trim() || null,
          status: newStatus,
        },
      },
      {
        onSuccess: () => {
          setPreviewPane("offer");
          setIsEditingOffer(false);
          toast.success("Offer saved");
        },
        onError: (e) => {
          toast.error(
            e instanceof Error ? e.message : "Failed to save offer",
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="w-[520px] border-l border-slate-100 dark:border-neutral-800 flex items-center justify-center bg-white dark:bg-neutral-950 shrink-0">
        <p className="text-slate-400 dark:text-neutral-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!candidate) return null;

  const offer = candidate.offer;
  const offerStyle = offer
    ? (OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft)
    : null;

  const fillFromJobAndCandidate = () => {
    const job = jobData?.data;
    if (!job) {
      toast.error("Job details could not be loaded.");
      return;
    }
    if (job.salaryType === "fixed" && job.salaryFixed) {
      setEditSalary(String(Number(job.salaryFixed)));
    } else if (job.salaryType === "range" && job.salaryMin && job.salaryMax) {
      setEditSalary(
        String(
          Math.round(
            (Number(job.salaryMin) + Number(job.salaryMax)) / 2,
          ),
        ),
      );
    }
    if (job.currency) setEditCurrency(job.currency);
    const pf = job.payFrequency;
    if (
      pf &&
      ["hourly", "daily", "weekly", "monthly", "yearly"].includes(pf)
    ) {
      setEditPayFreq(pf);
    }
    if (!editBenefits.trim()) {
      setEditBenefits(
        `Candidate: ${candidate.firstName} ${candidate.lastName}\nEmail: ${candidate.email}${candidate.phone ? `\nPhone: ${candidate.phone}` : ""}`,
      );
    }
    toast.success("Filled salary and pay from the job; added candidate details to benefits when empty.");
  };

  const cvAnalysis = candidate.cvAnalysis;
  const resumeViewUrl = candidate.resumeUrl
    ? `/api/candidates/${candidateId}/resume`
    : null;

  const TABS = [
    { value: "job-fit", label: "Job fit" },
    { value: "answers", label: "Answers" },
    { value: "history", label: "Stage History" },
    { value: "offer", label: "Offer" },
    { value: "email", label: "Send Email" },
    { value: "scores", label: "Assessments" },
  ];

  const triggerBase =
    "shrink-0 data-active:!bg-[var(--theme-color)] data-active:!border-[var(--theme-color)] data-active:!text-white border border-slate-200 dark:border-neutral-800 rounded-[8px] px-4 py-1.5 text-[13px] font-medium text-slate-600 dark:text-neutral-400 shadow-none bg-white dark:bg-neutral-900 cursor-pointer whitespace-nowrap";

  const orphanOfferTemplateSelected =
    editTemplateId &&
    editTemplateId !== "__none__" &&
    !offerTemplates.some((t) => String(t.id) === editTemplateId);

  const offerTemplateField = (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
        Offer letter template
      </Label>
      <Select
        value={editTemplateId || "__none__"}
        onValueChange={(v) =>
          setEditTemplateId(v == null || v === "__none__" ? "" : v)
        }
      >
        <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] w-full">
          <SelectValue placeholder="Select template">
            {editTemplateSelectLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-[min(60vh,280px)]">
          <SelectItem value="__none__" className="text-[13px] text-slate-500">
            No template
          </SelectItem>
          {orphanOfferTemplateSelected && (
            <SelectItem
              value={editTemplateId}
              className="text-[13px] text-amber-700 dark:text-amber-400"
            >
              {editTemplateSelectLabel}
              {" — not in offer list"}
            </SelectItem>
          )}
          {offerTemplates.map((t) => (
            <SelectItem key={t.id} value={String(t.id)} className="text-[13px]">
              {t.name}
              {t.isDefault ? " (default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {offerTemplates.length === 0 && (
        <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
          Create an offer template under Settings → Templates. Mark one as{" "}
          <strong>default</strong> so it is used when a pipeline stage does not specify a template.
        </p>
      )}
    </div>
  );

  const selectedOfferTemplateLabel =
    offer?.templateId != null
      ? allTemplates.find((t) => t.id === offer.templateId)?.name ??
        `Template #${offer.templateId}`
      : "—";

  return (
    <div className="w-[520px] border-l border-slate-100 dark:border-neutral-800 flex flex-col flex-1 min-h-0 bg-white dark:bg-neutral-950 overflow-hidden shrink-0">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden m-0 min-h-0"
      >
        <div
          ref={tabsScrollRef}
          onWheel={handleTabsWheel}
          className="border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="px-4 py-2.5">
            <TabsList className="bg-transparent h-fit p-0 w-max flex gap-1.5">
              {TABS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value} className={triggerBase}>
                  {label}
                  {value === "job-fit" && cvAnalysis?.status === "pending" && (
                    <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                      …
                    </span>
                  )}
                  {value === "offer" && offer && (
                    <span className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${offerStyle?.bg} dark:bg-opacity-20 ${offerStyle?.text}`}>
                      {offer.status}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <TabsContent
          value="job-fit"
          className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel"
        >
          <CandidateJobFitTab
            resumeUrl={resumeViewUrl}
            cv={cvAnalysis}
          />
        </TabsContent>

        <TabsContent value="answers" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          {candidate.answers.length === 0 && candidate.selections.length === 0 ? (
            <p className="text-slate-400 dark:text-neutral-500 text-sm italic">No custom answers submitted.</p>
          ) : (
            <div className="space-y-5">
              {candidate.answers.map((a) => (
                <div key={a.id} className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">
                    {a.questionTitle || `Question #${a.questionId}`}
                  </p>
                  <p className="text-[14px] text-slate-700 dark:text-neutral-300 leading-relaxed">
                    {a.answerText ?? <em className="text-slate-400 dark:text-neutral-500">No text answer</em>}
                  </p>
                </div>
              ))}
              {candidate.selections.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
                  {Array.from(new Set(candidate.selections.map(s => s.questionTitle || `Question #${s.questionId}`))).map((title) => (
                    <div key={title} className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">
                        {title}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {candidate.selections
                          .filter((s) => (s.questionTitle || `Question #${s.questionId}`) === title)
                          .map((s) => (
                            <span key={s.id} className="text-[12px] bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 px-2.5 py-1 rounded-md font-medium border border-slate-200 dark:border-neutral-700">
                              {s.optionLabel || `Option #${s.optionId}`}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          {candidate.history.length === 0 ? (
            <p className="text-slate-400 dark:text-neutral-500 text-sm italic">No stage history yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-neutral-800" />
              <div className="space-y-5 pl-6">
                {candidate.history.map((h, i) => (
                  <div key={h.id} className="relative">
                    <div
                      className={`absolute -left-6 top-1 size-3.5 rounded-full border-2 border-white dark:border-neutral-950 ring-2 ${i === candidate.history.length - 1
                        ? "bg-[var(--theme-color)] ring-[var(--theme-color)]/30"
                        : "bg-slate-300 dark:bg-neutral-700 ring-slate-200 dark:ring-neutral-800"
                        }`}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[14px] font-semibold text-slate-800 dark:text-neutral-200">
                        {stageMap[h.stageId] ?? `Stage #${h.stageId}`}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatTimeAgo(h.movedAt)}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-400 mt-0.5">
                      {new Date(h.movedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="offer" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          {!offer ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
              <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
              <p className="text-slate-500 dark:text-neutral-400 font-medium text-[14px]">No offer yet</p>
              <p className="text-slate-400 dark:text-neutral-500 text-[13px] max-w-[220px] leading-relaxed">
                An offer will appear here once the candidate reaches an offer stage.
              </p>
            </div>
          ) : isEditingOffer ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <p className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">Edit Offer</p>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Switch the left column to the offer letter preview."
                    onClick={() => setPreviewPane("offer")}
                    className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 shadow-none rounded-lg"
                  >
                    Letter preview
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Prefill salary and pay frequency from the job; if benefits are empty, add candidate name, email, and phone."
                    onClick={fillFromJobAndCandidate}
                    className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 shadow-none rounded-lg"
                  >
                    Fill from job &amp; candidate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingOffer(false)}
                    className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 shadow-none rounded-lg gap-1.5"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveOffer}
                    disabled={updateOfferMutation.isPending}
                    className="h-8 px-3 text-[12px] bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg gap-1.5"
                  >
                    <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
                    {updateOfferMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>

              {offerTemplateField}

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v ?? "")}>
                  <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    {["draft", "sent", "pending", "accepted", "declined", "withdrawn"].map((s) => (
                      <SelectItem key={s} value={s} className="text-[13px] capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Currency</Label>
                  <Select value={editCurrency} onValueChange={(v) => setEditCurrency(v ?? "")}>
                    <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      {["USD", "EUR", "GBP", "LKR", "INR", "AUD"].map((c) => (
                        <SelectItem key={c} value={c} className="text-[13px]">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Pay Frequency</Label>
                  <Select value={editPayFreq} onValueChange={(v) => setEditPayFreq(v ?? "")}>
                    <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      {["hourly", "daily", "weekly", "monthly", "yearly"].map((f) => (
                        <SelectItem key={f} value={f} className="text-[13px] capitalize">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Salary</Label>
                <Input
                  type="number"
                  min={0}
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  placeholder="e.g. 75000"
                  className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Start Date</Label>
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Expiry Date</Label>
                  <Input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Benefits & perks
                </Label>
                <Textarea
                  value={editBenefits}
                  onChange={(e) => setEditBenefits(e.target.value)}
                  placeholder="e.g. Health insurance, 20 days PTO, remote work… (use {{benefits}} in the offer template)"
                  rows={4}
                  className="border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[13px] resize-y min-h-[88px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                />
              </div>

              {updateOfferMutation.isError && (
                <p className="text-red-500 text-[12px]">
                  {(updateOfferMutation.error as Error).message ?? "Failed to save offer."}
                </p>
              )}
            </div>
          ) : offer.status === "draft" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/90 dark:bg-neutral-900/50 px-3 py-2.5">
                <p className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200">Draft offer</p>
                <p className="text-[12px] text-slate-600 dark:text-neutral-400 mt-1 leading-relaxed">
                  Fill in the details below, then <strong>Save draft</strong> to refresh the letter in the <strong>left preview</strong>. When it looks right, send it to {candidate.email}. Templates can include{" "}
                  <code className="text-[11px] bg-slate-200/80 dark:bg-neutral-800 px-1 rounded">{"{{benefits}}"}</code>{" "}
                  for this block.
                </p>
              </div>

              {offerTemplateField}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Switch the left column to the offer letter preview."
                  onClick={() => setPreviewPane("offer")}
                  className="h-9 px-4 text-[13px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg"
                >
                  Show letter preview
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Prefill salary and pay frequency from the job; if benefits are empty, add candidate name, email, and phone."
                onClick={fillFromJobAndCandidate}
                className="h-9 w-full sm:w-auto px-4 text-[13px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg"
              >
                Fill from job &amp; candidate
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Currency</Label>
                  <Select value={editCurrency} onValueChange={(v) => setEditCurrency(v ?? "")}>
                    <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      {["USD", "EUR", "GBP", "LKR", "INR", "AUD"].map((c) => (
                        <SelectItem key={c} value={c} className="text-[13px]">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Pay Frequency</Label>
                  <Select value={editPayFreq} onValueChange={(v) => setEditPayFreq(v ?? "")}>
                    <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      {["hourly", "daily", "weekly", "monthly", "yearly"].map((f) => (
                        <SelectItem key={f} value={f} className="text-[13px] capitalize">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Salary</Label>
                <Input
                  type="number"
                  min={0}
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  placeholder="e.g. 75000"
                  className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Start date</Label>
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Offer expires</Label>
                  <Input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Benefits & perks
                </Label>
                <Textarea
                  value={editBenefits}
                  onChange={(e) => setEditBenefits(e.target.value)}
                  placeholder="Health, PTO, equity, signing bonus, etc."
                  rows={4}
                  className="border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[13px] resize-y min-h-[88px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                />
              </div>

              <Button
                type="button"
                size="sm"
                onClick={saveOffer}
                disabled={updateOfferMutation.isPending}
                className="h-9 w-full sm:w-auto px-4 text-[13px] bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg"
              >
                {updateOfferMutation.isPending ? "Saving…" : "Save draft & update preview"}
              </Button>

              <p className="text-[12px] text-slate-500 dark:text-neutral-400 leading-relaxed pt-1">
                The rendered letter appears at the top when you choose <strong>Offer letter</strong> in the preview (or open the <strong>Offer</strong> tab — it switches the preview automatically).
                {!offer.renderedHtml && (
                  <>
                    {" "}
                    If preview stays empty, ensure the job’s offer stage has an <strong>offer template</strong>, then save again.
                  </>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    updateOfferStatusMutation.isPending ||
                    !offer.renderedHtml
                  }
                  title={
                    !offer.renderedHtml
                      ? "Save draft first to build the letter from your template"
                      : "Email the candidate via Resend"
                  }
                  onClick={() =>
                    updateOfferStatusMutation.mutate(
                      { id: offer.id, status: "sent" },
                      {
                        onSuccess: () => {
                          toast.success(
                            offer.renderedHtml
                              ? "Offer sent to the candidate’s email."
                              : "Offer marked as sent.",
                          );
                        },
                        onError: (e) => {
                          toast.error(
                            e instanceof Error
                              ? e.message
                              : "Could not send offer",
                          );
                        },
                      },
                    )
                  }
                  className="h-9 px-4 text-[13px] bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg gap-1.5 disabled:opacity-50"
                >
                  <HugeiconsIcon icon={SentIcon} className="size-3.5 rotate-[-45deg]" strokeWidth={2.5} />
                  {updateOfferStatusMutation.isPending ? "Sending…" : "Send offer to candidate"}
                </Button>
              </div>

              {updateOfferMutation.isError && (
                <p className="text-red-500 text-[12px]">
                  {(updateOfferMutation.error as Error).message ?? "Failed to save offer."}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">Status</span>
                  <Badge className={`${offerStyle?.bg} ${offerStyle?.text} hover:opacity-90 border-none shadow-none font-semibold px-3 py-1 rounded-md text-[11px] uppercase tracking-wider`}>
                    {offer.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {(offer.status === "sent" || offer.status === "pending") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        updateOfferStatusMutation.isPending ||
                        !offer.renderedHtml
                      }
                      title={
                        !offer.renderedHtml
                          ? "No letter HTML — edit the offer, pick a template, and save."
                          : "Send again via Resend (see RESEND_FROM_EMAIL, e.g. user.openats@gmail.com)"
                      }
                      onClick={() =>
                        updateOfferStatusMutation.mutate(
                          {
                            id: offer.id,
                            status: "sent",
                            candidateId,
                          },
                          {
                            onSuccess: (payload) => {
                              const o = payload?.data;
                              toast.success(
                                o?.renderedHtml
                                  ? "Offer resent to the candidate."
                                  : "Status updated. No email — letter is not rendered yet.",
                              );
                            },
                            onError: (e) => {
                              toast.error(
                                e instanceof Error
                                  ? e.message
                                  : "Could not resend",
                              );
                            },
                          },
                        )
                      }
                      className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 shadow-none rounded-lg gap-1.5 disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={SentIcon} className="size-3.5 rotate-[-45deg]" strokeWidth={2.5} />
                      {updateOfferStatusMutation.isPending ? "Resending…" : "Resend"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openOfferEdit}
                    className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 shadow-none rounded-lg gap-1.5"
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} className="size-3.5" />
                    Edit
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
                {[
                  { label: "Letter template", value: selectedOfferTemplateLabel },
                  {
                    label: "Salary",
                    value: offer.salary
                      ? `${offer.currency ?? ""} ${Number(offer.salary).toLocaleString()}${offer.payFrequency ? ` / ${offer.payFrequency}` : ""}`.trim()
                      : "—",
                  },
                  { label: "Start Date", value: formatDate(offer.startDate) },
                  { label: "Expiry Date", value: formatDate(offer.expiryDate) },
                  {
                    label: "Benefits",
                    value:
                      offer.benefitsText?.trim() ? offer.benefitsText.trim() : "—",
                  },
                  { label: "Sent At", value: offer.sentAt ? formatTimeAgo(offer.sentAt) : "Not sent yet" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 gap-4">
                    <span className="text-[13px] text-slate-500 dark:text-neutral-400 font-medium shrink-0">{label}</span>
                    <span className="text-[13px] text-slate-800 dark:text-neutral-200 font-semibold text-right break-words">{value}</span>
                  </div>
                ))}
              </div>

              <p className="text-[12px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                Use <strong>Offer letter</strong> on the <strong>left</strong> to read the full letter, or stay on this tab for details.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="email" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-[12px] text-slate-500 dark:text-neutral-400 leading-relaxed -mt-1 flex-1 min-w-0">
                The <strong>Email</strong> preview on the <strong>left</strong> updates as you type (choose <strong>Email</strong> there if you don’t see it).
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewPane("email")}
                className="h-8 shrink-0 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg"
              >
                Show email preview
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">To</Label>
              <Input
                value={candidate.email}
                readOnly
                className="h-10 border-slate-200 dark:border-neutral-800 shadow-none bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 text-[13px] focus-visible:ring-0 focus-visible:border-slate-200 dark:focus-visible:border-neutral-800 cursor-default"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="e.g. Interview Invitation — Software Engineer"
                className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
              />
            </div>
            <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Message</Label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Write your message here..."
                className="flex-1 min-h-[160px] w-full rounded-md border border-slate-200 dark:border-neutral-800 px-3 py-2.5 text-[13px] text-slate-700 dark:text-neutral-300 bg-white dark:bg-neutral-950 leading-relaxed resize-none focus:outline-none focus:border-[var(--theme-color)] transition-[border-color] duration-200"
              />
            </div>
            <div className="flex items-center justify-between pt-1 shrink-0">
              <span className="text-[12px] text-slate-400">
                Sending to <strong className="text-slate-600 dark:text-neutral-300">{candidate.email}</strong>
              </span>
              <Button
                disabled={!emailSubject.trim() || !emailBody.trim()}
                className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[13px] gap-2 px-5 h-9 rounded-[8px] shadow-none border-none disabled:opacity-50"
              >
                <HugeiconsIcon icon={SentIcon} className="size-4 rotate-[-45deg]" strokeWidth={2.5} />
                Send Email
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scores" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          {(() => {
            const attempts = assessmentsData?.data ?? [];
            if (!assessmentsData) {
              return <p className="text-slate-400 dark:text-neutral-500 text-sm italic">Loading…</p>;
            }
            if (attempts.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                  <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-slate-500 font-medium text-[14px]">No assessments yet</p>
                  <p className="text-slate-400 text-[13px] max-w-[220px] leading-relaxed">
                    Assessment results will appear here once the candidate completes an assessment.
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {attempts.map((a) => {
                  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
                    pending: { bg: "bg-amber-50", text: "text-amber-600", label: "Pending" },
                    started: { bg: "bg-blue-50", text: "text-blue-600", label: "In Progress" },
                    completed: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
                    expired: { bg: "bg-slate-100", text: "text-slate-500", label: "Expired" },
                  };
                  const s = statusStyles[a.status] ?? statusStyles.pending;
                  const score = a.scorePercentage != null ? Math.round(Number(a.scorePercentage)) : null;
                  const passColor = a.passed ? "text-green-600" : "text-red-500";

                  return (
                    <div key={a.id} className="rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-neutral-900 border-b border-slate-100 dark:border-neutral-800">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200 truncate pr-3">
                          {a.assessmentTitle}
                        </p>
                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${s.bg} dark:bg-opacity-20 ${s.text}`}>
                          {s.label}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                        {score != null && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 dark:text-neutral-400 font-medium">Score</span>
                            <div className="flex items-center gap-2">
                              <div className="w-28 h-1.5 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${score >= 50 ? "bg-green-500" : "bg-red-400"}`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className={`text-[13px] font-bold ${passColor}`}>
                                {score}%
                              </span>
                            </div>
                          </div>
                        )}
                        {a.passed != null && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 font-medium">Result</span>
                            <span className={`text-[13px] font-semibold ${passColor}`}>
                              {a.passed ? "Passed ✓" : "Not Passed ✗"}
                            </span>
                          </div>
                        )}
                        {a.completedAt && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 font-medium">Completed</span>
                            <span className="text-[13px] text-slate-700 dark:text-neutral-300 font-medium">
                              {formatDate(a.completedAt)}
                            </span>
                          </div>
                        )}
                        {a.status === "pending" && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 font-medium">Link expires</span>
                            <span className="text-[13px] text-slate-700 dark:text-neutral-300 font-medium">
                              {formatDate(a.expiresAt)}
                            </span>
                          </div>
                        )}
                        {(a.status === "pending" || a.status === "started") && (
                          <div className="px-4 py-3">
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/assessment/${a.token}`;
                                navigator.clipboard.writeText(url);
                              }}
                              className="text-[12px] text-[var(--theme-color)] font-medium hover:underline"
                            >
                              Copy assessment link
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
