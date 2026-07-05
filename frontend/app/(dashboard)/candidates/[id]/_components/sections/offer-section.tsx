"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  SentIcon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
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
  const [editStatus, setEditStatus] = useState("draft");

  const offerStyle = offer
    ? (OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft)
    : null;

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
    setEditStatus(offer.status ?? "draft");
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
                  className="mt-4 h-7 rounded-md border-none bg-[var(--theme-color)] px-2.5 text-sm font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                >
                  Generate Offer
                </Button>
              );
            }
            return null;
          })()}
        </div>
      ) : isEditingOffer ? (
        <div className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-slate-800 dark:text-neutral-200">
                Edit Offer
              </p>
              <Badge
                className={`${offerStyle?.bg} ${offerStyle?.text} border-none shadow-none font-bold px-2.5 py-0.5 rounded-md text-xs uppercase tracking-wider`}
              >
                {offer?.status ?? "draft"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsEditingOffer(false)}
                className="h-7 rounded-md border-none bg-neutral-800 px-2.5 text-sm font-semibold text-white shadow-none hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveOfferDraft}
                disabled={updateOfferMutation.isPending}
                className="h-7 rounded-md border-none bg-neutral-700 px-2.5 text-sm font-semibold text-white shadow-none hover:bg-neutral-600 disabled:opacity-60"
              >
                {updateOfferMutation.isPending ? "Saving…" : "Save Draft"}
              </Button>
              <Button
                size="sm"
                disabled={
                  updateOfferMutation.isPending || sendOfferMutation.isPending
                }
                onClick={handleSendOffer}
                className="h-7 rounded-md border-none bg-[var(--theme-color)] px-2.5 text-sm font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-60"
              >
                <HugeiconsIcon
                  icon={SentIcon}
                  className="size-3 rotate-[-45deg] mr-1"
                  strokeWidth={2.5}
                />
                {sendOfferMutation.isPending ? "Sending…" : "Send Offer"}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Template
              </Label>
              <Select
                value={offerTemplateId}
                onValueChange={(v) => setOfferTemplateId(v ?? "")}
              >
                <SelectTrigger className="h-8 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-sm focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-md">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent className="rounded-md shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                  <SelectItem value="" className="text-sm">
                    No template
                  </SelectItem>
                  {emailTemplates.map((t: any) => (
                    <SelectItem
                      key={t.id}
                      value={String(t.id)}
                      className="text-sm"
                    >
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Currency
                </Label>
                <Select
                  value={editCurrency}
                  onValueChange={(v) => setEditCurrency(v ?? "")}
                >
                  <SelectTrigger className="h-8 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-sm focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-md shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    {["USD", "EUR", "GBP", "LKR", "INR", "AUD"].map((c) => (
                      <SelectItem key={c} value={c} className="text-sm">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Employment Type
                </Label>
                <Select
                  value={editEmploymentType}
                  onValueChange={(v) =>
                    setEditEmploymentType(v as typeof editEmploymentType)
                  }
                >
                  <SelectTrigger className="h-8 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-sm focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-md shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    {[
                      "full_time",
                      "part_time",
                      "contract",
                      "internship",
                      "freelance",
                    ].map((e) => (
                      <SelectItem
                        key={e}
                        value={e}
                        className="text-sm capitalize"
                      >
                        {e.replace("_", "-")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 mt-4">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Salary
              </Label>
              <Input
                type="number"
                min={0}
                value={editSalary}
                onChange={(e) => setEditSalary(e.target.value)}
                placeholder="e.g. 75000"
                className="h-8 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-sm focus:ring-0 focus:border-[var(--theme-color)] rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="h-8 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-sm focus:ring-0 focus:border-[var(--theme-color)] rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Reporting Manager
                </Label>
                <Input
                  value={editReportingManager}
                  onChange={(e) => setEditReportingManager(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="h-8 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-sm focus:ring-0 focus:border-[var(--theme-color)] rounded-md"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Benefits
              </Label>
              <textarea
                value={editBenefits}
                onChange={(e) => setEditBenefits(e.target.value)}
                placeholder="e.g. Health insurance, 401k matching, 20 PTO days..."
                className="min-h-[100px] w-full rounded-md border border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 px-3 py-2.5 text-sm shadow-none resize-none focus:outline-none focus:border-[var(--theme-color)]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Offer Letter (HTML)
                </Label>
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
                  className="text-xs font-semibold text-[var(--theme-color)] hover:underline"
                >
                  Generate from template
                </button>
              </div>
              <textarea
                value={editOfferLetterHtml}
                onChange={(e) => setEditOfferLetterHtml(e.target.value)}
                placeholder="<p>Dear candidate...</p>"
                className="min-h-[180px] w-full rounded-md border border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 px-3 py-2.5 text-sm font-mono shadow-none resize-none focus:outline-none focus:border-[var(--theme-color)]"
              />
            </div>

            {updateOfferMutation.isError && (
              <p className="text-red-500 text-xs font-medium">
                {(updateOfferMutation.error as Error).message ??
                  "Failed to save offer."}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`size-2.5 rounded-full ${offerStyle?.dot ?? "bg-slate-400"}`}
                />
                <span className="text-sm font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </span>
                <Badge
                  className={`${offerStyle?.bg} ${offerStyle?.text} hover:opacity-90 border-none shadow-none font-bold px-3 py-1 rounded-md text-xs uppercase tracking-wider`}
                >
                  {offer.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {offer.status === "draft" && (
                  <Button
                    size="sm"
                    disabled={
                      updateOfferMutation.isPending ||
                      sendOfferMutation.isPending
                    }
                    onClick={handleSendOffer}
                    className="h-7 rounded-md border-none bg-[var(--theme-color)] px-2.5 text-sm font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-60"
                  >
                    <HugeiconsIcon
                      icon={SentIcon}
                      className="size-3 rotate-[-45deg]"
                      strokeWidth={2.5}
                    />
                    {sendOfferMutation.isPending ? "Sending…" : "Send Offer"}
                  </Button>
                )}
                {offer.status === "accepted" && (
                  <Button
                    size="sm"
                    disabled={markOfferAsHiredMutation.isPending}
                    onClick={() =>
                      markOfferAsHiredMutation.mutate(offer.id, {
                        onSuccess: () =>
                          toast.success("Candidate marked as hired"),
                        onError: (err) =>
                          toast.error(
                            (err as Error).message || "Failed to mark as hired",
                          ),
                      })
                    }
                    className="h-7 rounded-md border-none bg-emerald-600 px-2.5 text-sm font-semibold text-white shadow-none hover:bg-emerald-500"
                  >
                    {markOfferAsHiredMutation.isPending
                      ? "Marking…"
                      : "Mark as Hired"}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={openOfferEdit}
                  className="h-7 rounded-md border-none bg-neutral-800 px-2.5 text-sm font-semibold text-white shadow-none hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                >
                  <HugeiconsIcon icon={PencilEdit01Icon} className="size-3" />
                  Edit
                </Button>
              </div>
            </div>
            <Separator />
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {[
                {
                  label: "Salary",
                  value: offer.salary
                    ? `${offer.currency ?? ""} ${Number(offer.salary).toLocaleString()}`.trim()
                    : "—",
                },
                {
                  label: "Employment Type",
                  value: offer.employmentType
                    ? offer.employmentType.replace("_", "-")
                    : "—",
                },
                { label: "Start Date", value: formatDate(offer.startDate) },
                {
                  label: "Reporting Manager",
                  value: offer.reportingManager || "—",
                },
                {
                  label: "Sent At",
                  value: offer.sentAt
                    ? formatDate(offer.sentAt)
                    : "Not sent yet",
                },
                ...(offer.viewedAt
                  ? [{ label: "Viewed At", value: formatDate(offer.viewedAt) }]
                  : []),
                ...(offer.acceptedAt
                  ? [
                      {
                        label: "Accepted At",
                        value: formatDate(offer.acceptedAt),
                      },
                    ]
                  : []),
                ...(offer.declinedAt
                  ? [
                      {
                        label: "Declined At",
                        value: formatDate(offer.declinedAt),
                      },
                    ]
                  : []),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-5 py-3.5 gap-4"
                >
                  <span className="text-sm text-slate-500 dark:text-neutral-400 font-medium">
                    {label}
                  </span>
                  <span className="text-sm text-slate-800 dark:text-neutral-200 font-semibold text-right break-words">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {offer.benefits && (
              <>
                <Separator />
                <div className="px-5 py-4">
                  <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    Benefits
                  </p>
                  <p className="text-sm text-slate-600 dark:text-neutral-400 whitespace-pre-line leading-relaxed">
                    {offer.benefits}
                  </p>
                </div>
              </>
            )}
          </div>

          {offer.offerLetterHtml && (
            <div className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                Offer Letter Preview
              </p>
              <div
                className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed max-h-[340px] overflow-y-auto prose prose-sm w-full"
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
