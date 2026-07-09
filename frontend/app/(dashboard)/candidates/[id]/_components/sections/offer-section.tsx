"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  SentIcon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateOffer,
  useSendOffer,
  useMarkOfferAsHired,
} from "@/hooks/queries/use-offers";
import { serverFetch } from "@/lib/auth-action";
import { OFFER_STATUS_STYLES, formatDate } from "../constants";

interface OfferSectionProps {
  candidate: any;
  candidateId: number;
  offer: any;
  pipelineStages: any[];
  emailTemplates: any[];
  jobId: number;
}

const inputCls =
  "h-9 bg-gray-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 rounded-md shadow-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 transition-colors";

const selectTriggerCls =
  "w-full h-9! rounded-md bg-gray-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 shadow-none px-3! py-0! text-sm focus-visible:ring-0 focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 transition-colors";

const textareaCls =
  "w-full rounded-md border border-slate-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm shadow-none resize-none placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 transition-colors";

const labelCls =
  "text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block";

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

function StatusPill({ status }: { status: string }) {
  const style = OFFER_STATUS_STYLES[status] ?? OFFER_STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${style?.bg} ${style?.text}`}
    >
      {status}
    </span>
  );
}

export function OfferSection({
  candidate,
  candidateId,
  offer,
  pipelineStages,
  emailTemplates,
  jobId,
}: OfferSectionProps) {
  const queryClient = useQueryClient();
  const updateOfferMutation = useUpdateOffer();
  const sendOfferMutation = useSendOffer();
  const markOfferAsHiredMutation = useMarkOfferAsHired();

  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [editSalary, setEditSalary] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editEmploymentType, setEditEmploymentType] = useState<
    "full_time" | "part_time" | "contract" | "internship" | "freelance"
  >("full_time");
  const [editStartDate, setEditStartDate] = useState("");
  const [editReportingManager, setEditReportingManager] = useState("");
  const [editBenefits, setEditBenefits] = useState("");
  const [editOfferLetterHtml, setEditOfferLetterHtml] = useState("");
  const [offerTemplateId, setOfferTemplateId] = useState("");

  const syncOfferForm = () => {
    if (!offer) return;
    setEditSalary(offer.salary ? String(Number(offer.salary)) : "");
    setEditCurrency(offer.currency ?? "USD");
    setEditEmploymentType(offer.employmentType ?? "full_time");
    setEditStartDate(offer.startDate ?? "");
    setEditReportingManager(offer.reportingManager ?? "");
    setEditBenefits(offer.benefits ?? "");
    setEditOfferLetterHtml(offer.offerLetterHtml ?? "");
    setOfferTemplateId(offer.templateId ? String(offer.templateId) : "");
  };

  const openOfferEdit = () => {
    syncOfferForm();
    setIsEditingOffer(true);
  };

  const saveOfferDraft = () => {
    if (!offer) return;
    updateOfferMutation.mutate(
      {
        offerId: offer.id,
        data: {
          templateId: offerTemplateId ? Number(offerTemplateId) : null,
          salary: editSalary ? Number(editSalary) : null,
          currency: editCurrency || null,
          employmentType: editEmploymentType,
          startDate: editStartDate || null,
          reportingManager: editReportingManager.trim() || null,
          benefits: editBenefits.trim() || null,
          offerLetterHtml: editOfferLetterHtml.trim() || null,
          status: "draft",
        },
      },
      {
        onSuccess: () => toast.success("Offer draft saved."),
        onError: (error) => {
          toast.error((error as Error).message || "Failed to save draft.");
        },
      },
    );
  };

  const handleSendOffer = () => {
    if (!offer) return;

    if (
      !editSalary ||
      !editCurrency ||
      !editEmploymentType ||
      !editStartDate ||
      !editReportingManager.trim() ||
      !editBenefits.trim() ||
      !editOfferLetterHtml.trim()
    ) {
      toast.error("Complete all required offer fields before sending.");
      return;
    }

    updateOfferMutation.mutate(
      {
        offerId: offer.id,
        data: {
          templateId: offerTemplateId ? Number(offerTemplateId) : null,
          salary: Number(editSalary),
          currency: editCurrency,
          employmentType: editEmploymentType,
          startDate: editStartDate,
          reportingManager: editReportingManager.trim(),
          benefits: editBenefits.trim(),
          offerLetterHtml: editOfferLetterHtml.trim(),
        },
      },
      {
        onSuccess: () => {
          sendOfferMutation.mutate(offer.id, {
            onSuccess: () => {
              toast.success("Offer sent to candidate.");
              setIsEditingOffer(false);
            },
            onError: (error) => {
              toast.error((error as Error).message || "Failed to send offer.");
            },
          });
        },
        onError: (error) => {
          toast.error((error as Error).message || "Failed to update offer.");
        },
      },
    );
  };

  const sending = updateOfferMutation.isPending || sendOfferMutation.isPending;

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
          Offer Details
        </h3>
        <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
          Compensation package and offer letter
        </p>
      </div>

      {!offer ? (
        <div className="rounded-md border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
          <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
            <HugeiconsIcon
              icon={Award01Icon}
              className="size-5 text-slate-300 dark:text-neutral-600"
            />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
            No offer yet
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 max-w-[260px] mx-auto">
            An offer will appear here once the candidate reaches an offer stage.
          </p>
          {(() => {
            const currentStage = pipelineStages.find(
              (s) => s.id === candidate.currentStageId,
            );
            if (currentStage?.stageType === "offer") {
              return (
                <Button
                  size="sm"
                  onClick={() => {
                    serverFetch("/offers", {
                      method: "POST",
                      body: JSON.stringify({
                        candidateId,
                        jobId,
                      }),
                    })
                      .then(() => {
                        queryClient.invalidateQueries({
                          queryKey: ["candidates", candidateId],
                        });
                        toast.success("Offer draft created");
                      })
                      .catch(() => toast.error("Failed to create offer"));
                  }}
                  className="mt-4 h-8 rounded-md border-none bg-[var(--theme-color)] px-3.5 text-xs font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] cursor-pointer"
                >
                  Generate Offer
                </Button>
              );
            }
            return null;
          })()}
        </div>
      ) : isEditingOffer ? (
        <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          {/* Edit header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                Edit Offer
              </p>
              <StatusPill status={offer?.status ?? "draft"} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingOffer(false)}
                disabled={sending}
                className="h-8 px-3 text-xs font-medium text-slate-600 dark:text-neutral-400 shadow-none border-none hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-neutral-100 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveOfferDraft}
                disabled={sending}
                className="h-8 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-xs font-semibold text-slate-700 dark:text-neutral-200 shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {updateOfferMutation.isPending && !sendOfferMutation.isPending && (
                  <Spinner className="size-3" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                disabled={sending}
                onClick={handleSendOffer}
                className="h-8 rounded-md border-none bg-[var(--theme-color)] px-3.5 text-xs font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {sendOfferMutation.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <HugeiconsIcon
                    icon={SentIcon}
                    className="size-3 rotate-[-45deg]"
                    strokeWidth={2.5}
                  />
                )}
                {sendOfferMutation.isPending ? "Sending" : "Send Offer"}
              </Button>
            </div>
          </div>

          {/* Edit form */}
          <div className="px-5 py-5 grid grid-cols-2 gap-x-4 gap-y-4">
            <div className="col-span-2">
              <Label className={labelCls}>Template</Label>
              <Select
                value={offerTemplateId}
                onValueChange={(v) => setOfferTemplateId(v ?? "")}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No template</SelectItem>
                  {emailTemplates.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={labelCls}>Salary</Label>
              <div className="flex gap-2">
                <Select
                  value={editCurrency}
                  onValueChange={(v) => setEditCurrency(v ?? "")}
                >
                  <SelectTrigger className={`${selectTriggerCls} w-24!`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "LKR", "INR", "AUD"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  placeholder="75,000"
                  className={`${inputCls} flex-1`}
                />
              </div>
            </div>

            <div>
              <Label className={labelCls}>Employment Type</Label>
              <Select
                value={editEmploymentType}
                onValueChange={(v) =>
                  setEditEmploymentType(v as typeof editEmploymentType)
                }
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue>
                    {EMPLOYMENT_LABELS[editEmploymentType]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={labelCls}>Start Date</Label>
              <Input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <Label className={labelCls}>Reporting Manager</Label>
              <Input
                value={editReportingManager}
                onChange={(e) => setEditReportingManager(e.target.value)}
                placeholder="e.g. Jane Smith"
                className={inputCls}
              />
            </div>

            <div className="col-span-2">
              <Label className={labelCls}>Benefits</Label>
              <textarea
                value={editBenefits}
                onChange={(e) => setEditBenefits(e.target.value)}
                placeholder="e.g. Health insurance, 401k matching, 20 PTO days..."
                className={`${textareaCls} min-h-[90px]`}
              />
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <Label className={`${labelCls} mb-0`}>Offer Letter (HTML)</Label>
                <button
                  type="button"
                  onClick={() => {
                    if (offerTemplateId) {
                      serverFetch<{
                        data: { subject: string; html: string };
                      }>(`/templates/${offerTemplateId}/preview`, {
                        method: "POST",
                        body: JSON.stringify({ candidateId }),
                      })
                        .then((res) => {
                          setEditOfferLetterHtml(res.data.html);
                          toast.success("Template rendered into editor");
                        })
                        .catch(() => toast.error("Failed to render template"));
                    } else {
                      toast.error("Select a template first to generate");
                    }
                  }}
                  className="text-xs font-medium text-[var(--theme-color)] hover:underline cursor-pointer"
                >
                  Generate from template
                </button>
              </div>
              <textarea
                value={editOfferLetterHtml}
                onChange={(e) => setEditOfferLetterHtml(e.target.value)}
                placeholder="<p>Dear candidate...</p>"
                className={`${textareaCls} min-h-[180px] font-mono text-xs`}
              />
            </div>

            {updateOfferMutation.isError && (
              <p className="col-span-2 text-red-500 text-xs font-medium">
                {(updateOfferMutation.error as Error).message ??
                  "Failed to save offer."}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-neutral-800">
              <StatusPill status={offer.status} />
              <div className="flex items-center gap-2">
                {offer.status === "draft" && (
                  <Button
                    size="sm"
                    disabled={sending}
                    onClick={handleSendOffer}
                    className="h-8 rounded-md border-none bg-[var(--theme-color)] px-3.5 text-xs font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendOfferMutation.isPending ? (
                      <Spinner className="size-3" />
                    ) : (
                      <HugeiconsIcon
                        icon={SentIcon}
                        className="size-3 rotate-[-45deg]"
                        strokeWidth={2.5}
                      />
                    )}
                    {sendOfferMutation.isPending ? "Sending" : "Send Offer"}
                  </Button>
                )}
                {offer.status === "accepted" &&
                  (candidate?.status === "hired" ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Hired
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={markOfferAsHiredMutation.isPending}
                      onClick={() =>
                        markOfferAsHiredMutation.mutate(offer.id, {
                          onSuccess: () =>
                            toast.success("Candidate marked as hired"),
                          onError: (err) =>
                            toast.error(
                              (err as Error).message ||
                                "Failed to mark as hired",
                            ),
                        })
                      }
                      className="h-8 rounded-md border-none bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-none hover:bg-emerald-500 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {markOfferAsHiredMutation.isPending && (
                        <Spinner className="size-3" />
                      )}
                      {markOfferAsHiredMutation.isPending
                        ? "Marking"
                        : "Mark as Hired"}
                    </Button>
                  ))}
                <Button
                  size="sm"
                  onClick={openOfferEdit}
                  className="h-8 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-xs font-semibold text-slate-700 dark:text-neutral-200 shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <HugeiconsIcon icon={PencilEdit01Icon} className="size-3" />
                  Edit
                </Button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {[
                {
                  label: "Salary",
                  value: offer.salary
                    ? `${offer.currency ?? ""} ${Number(offer.salary).toLocaleString()}`.trim()
                    : "—",
                },
                {
                  label: "Employment type",
                  value: offer.employmentType
                    ? (EMPLOYMENT_LABELS[offer.employmentType] ??
                      offer.employmentType)
                    : "—",
                },
                { label: "Start date", value: formatDate(offer.startDate) },
                {
                  label: "Reporting manager",
                  value: offer.reportingManager || "—",
                },
                {
                  label: "Sent",
                  value: offer.sentAt
                    ? formatDate(offer.sentAt)
                    : "Not sent yet",
                },
                ...(offer.viewedAt
                  ? [{ label: "Viewed", value: formatDate(offer.viewedAt) }]
                  : []),
                ...(offer.acceptedAt
                  ? [{ label: "Accepted", value: formatDate(offer.acceptedAt) }]
                  : []),
                ...(offer.declinedAt
                  ? [{ label: "Declined", value: formatDate(offer.declinedAt) }]
                  : []),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-5 py-3 gap-4"
                >
                  <span className="text-sm text-slate-500 dark:text-neutral-400">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-neutral-100 text-right break-words">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {offer.benefits && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-neutral-800">
                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5">
                  Benefits
                </p>
                <p className="text-sm text-slate-600 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                  {offer.benefits}
                </p>
              </div>
            )}
          </div>

          {offer.offerLetterHtml && (
            <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-3">
                Offer letter preview
              </p>
              <div
                className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed max-h-[340px] overflow-y-auto prose prose-sm w-full dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: offer.offerLetterHtml,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
