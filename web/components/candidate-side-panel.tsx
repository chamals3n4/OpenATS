"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, SentIcon, PencilEdit01Icon, Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CandidateJobFitTab } from "@/components/candidate-job-fit-tab";
import { useCandidate, usePipeline, useUpdateOffer, useUpdateOfferStatus, useCandidateAssessments } from "@/hooks/use-api";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const OFFER_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400" },
  sent: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400" },
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

  const { data: pipelineData } = usePipeline(candidate?.jobId ?? 0);
  const { data: assessmentsData } = useCandidateAssessments(candidateId);
  const stageMap = useMemo(
    () => Object.fromEntries((pipelineData?.data ?? []).map((s) => [s.id, s.name])),
    [pipelineData],
  );

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [editSalary, setEditSalary] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editPayFreq, setEditPayFreq] = useState("monthly");
  const [editStartDate, setEditStartDate] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editStatus, setEditStatus] = useState("draft");

  const updateOfferMutation = useUpdateOffer();
  const updateOfferStatusMutation = useUpdateOfferStatus();
  const tabsScrollRef = useRef<HTMLDivElement>(null);

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
    setEditCurrency(offer.currency ?? "USD");
    setEditPayFreq(offer.payFrequency ?? "monthly");
    setEditStartDate(offer.startDate ?? "");
    setEditExpiryDate(offer.expiryDate ?? "");
    setEditStatus(offer.status ?? "draft");
    setIsEditingOffer(true);
  };

  const saveOffer = () => {
    if (!offer) return;
    const statusChanged = editStatus !== offer.status;
    const newStatus = editStatus as "draft" | "sent" | "pending" | "accepted" | "declined" | "withdrawn";

    updateOfferMutation.mutate(
      {
        offerId: offer.id,
        data: {
          salary: editSalary ? Number(editSalary) : null,
          currency: editCurrency || null,
          payFrequency: editPayFreq as "hourly" | "daily" | "weekly" | "monthly" | "yearly",
          startDate: editStartDate || null,
          expiryDate: editExpiryDate || null,
        },
      },
      {
        onSuccess: () => {
          if (statusChanged) {
            updateOfferStatusMutation.mutate(
              { id: offer.id, status: newStatus },
              { onSuccess: () => setIsEditingOffer(false) },
            );
          } else {
            setIsEditingOffer(false);
          }
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

  const cvAnalysis = candidate.cvAnalysis;

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

  return (
    <div className="w-[520px] border-l border-slate-100 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-950 overflow-hidden shrink-0">
      <div className="h-[58px] shrink-0 flex items-center px-5 border-b border-slate-100 dark:border-neutral-800">
        {candidate.resumeUrl ? (
          <a href={candidate.resumeUrl} target="_blank" rel="noreferrer">
            <Button className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[12px] gap-2 px-4 h-9 rounded-[8px] shadow-none border-none">
              <span>View CV</span>
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" strokeWidth={2.5} />
            </Button>
          </a>
        ) : (
          <span className="text-slate-400 dark:text-neutral-500 text-sm italic">No resume uploaded</span>
        )}
      </div>

      <Tabs defaultValue="job-fit" className="flex-1 flex flex-col overflow-hidden m-0 min-h-0">
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
            resumeUrl={candidate.resumeUrl}
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
                        {timeAgo(h.movedAt)}
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
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">Edit Offer</p>
                <div className="flex items-center gap-2">
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
                  {(offer.status === "draft") && (
                    <Button
                      size="sm"
                      disabled={updateOfferStatusMutation.isPending}
                      onClick={() =>
                        updateOfferStatusMutation.mutate({ id: offer.id, status: "sent" })
                      }
                      className="h-8 px-3 text-[12px] bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg gap-1.5 disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={SentIcon} className="size-3.5 rotate-[-45deg]" strokeWidth={2.5} />
                      {updateOfferStatusMutation.isPending ? "Sending…" : "Send Offer"}
                    </Button>
                  )}
                  {(offer.status === "sent" || offer.status === "pending") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updateOfferStatusMutation.isPending}
                      onClick={() =>
                        updateOfferStatusMutation.mutate({ id: offer.id, status: "sent" })
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
                  {
                    label: "Salary",
                    value: offer.salary
                      ? `${offer.currency ?? ""} ${Number(offer.salary).toLocaleString()}${offer.payFrequency ? ` / ${offer.payFrequency}` : ""}`.trim()
                      : "—",
                  },
                  { label: "Start Date", value: formatDate(offer.startDate) },
                  { label: "Expiry Date", value: formatDate(offer.expiryDate) },
                  { label: "Sent At", value: offer.sentAt ? timeAgo(offer.sentAt) : "Not sent yet" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 gap-4">
                    <span className="text-[13px] text-slate-500 dark:text-neutral-400 font-medium shrink-0">{label}</span>
                    <span className="text-[13px] text-slate-800 dark:text-neutral-200 font-semibold text-right break-words">{value}</span>
                  </div>
                ))}
              </div>

              {offer.renderedHtml && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                    Offer Letter Preview
                  </p>
                  <div
                    className="rounded-xl border border-slate-200 dark:border-neutral-800 p-4 text-[13px] text-slate-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 leading-relaxed max-h-[340px] overflow-y-auto prose prose-sm w-full"
                    dangerouslySetInnerHTML={{ __html: offer.renderedHtml }}
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="email" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          <div className="space-y-4 h-full flex flex-col">
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
                        {a.status === "completed" && (
                          <div className="px-4 py-3">
                            <Link
                              href={`/candidates/${candidateId}/assessments/${a.id}`}
                              className={cn(
                                buttonVariants({ variant: "default", size: "default" }),
                                "w-full bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[13px] h-9 rounded-[8px] shadow-none border-none hover:text-white",
                              )}
                            >
                              Show Candidate Answers
                            </Link>
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
