"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MoreVerticalIcon,
  Archive01Icon,
  CallIcon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useOffers, useDeleteOffer } from "@/hooks/use-api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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

import { archiveItem } from "@/lib/archive-store";
import { CandidateDetailSheetProvider } from "@/components/candidate-detail-sheet-context";
import { CandidatePreviewPane } from "@/components/candidate-preview-pane";
import { CandidateSidePanel } from "@/components/candidate-side-panel";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";

type OfferStatus =
  | "Draft"
  | "Sent"
  | "Pending"
  | "Accepted"
  | "Declined"
  | "Withdrawn";

interface Offer {
  id: number;
  candidateId: number;
  candidateName: string;
  jobTitle: string;
  status: OfferStatus;
  salary: string;
  currency: string;
  createdAt: string;
  expiredDate: string;
  department: string;
  stage: string;
  phone: string;
  email: string;
  resumeUrl: string;
}

const OFFER_STATUS_STYLES: Record<OfferStatus, string> = {
  Draft:
    "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
  Sent: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  Pending:
    "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  Accepted:
    "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  Declined: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400",
  Withdrawn:
    "bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400",
};

function RowMenu({ onArchive }: { onArchive(): void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);
  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg shadow-lg py-1 text-sm">
          <button
            onClick={() => {
              setOpen(false);
              onArchive();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800"
          >
            <HugeiconsIcon
              icon={Archive01Icon}
              className="size-4 text-slate-400"
            />
            Archive
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManageOffersPage() {
  const { data: offersRes, isLoading: offersLoading } = useOffers();
  const deleteOfferMutation = useDeleteOffer();

  const rawOffers = offersRes?.data ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offers: Offer[] = rawOffers.map((o: Record<string, any>) => {
    const statusMap: Record<string, OfferStatus> = {
      draft: "Draft",
      sent: "Sent",
      pending: "Pending",
      accepted: "Accepted",
      declined: "Declined",
      withdrawn: "Withdrawn",
    };

    return {
      id: o.id,
      candidateId: o.candidate?.id ?? 0,
      candidateName:
        `${o.candidate?.firstName ?? ""} ${o.candidate?.lastName ?? ""}`.trim() ||
        "Unknown Candidate",
      jobTitle: o.job?.title ?? "Unknown Job",
      status: statusMap[o.status] ?? "Draft",
      salary: String(o.salary ?? ""),
      currency: o.currency ?? "USD",
      createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "",
      expiredDate: o.expiryDate
        ? new Date(o.expiryDate).toLocaleDateString()
        : "",
      department: o.job?.department?.name ?? "Other",
      stage: o.candidate?.currentStage?.name ?? "Unknown Stage",
      phone: o.candidate?.phone ?? "—",
      email: o.candidate?.email ?? "—",
      resumeUrl: o.candidate?.resumeUrl ?? "",
    };
  });

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [archiveTarget, setArchiveTarget] = useState<Offer | null>(null);

  const [selected, setSelected] = useState<Offer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openOffer = (o: Offer) => {
    setSelected(o);
    setSheetOpen(true);
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    const target = archiveTarget;
    deleteOfferMutation.mutate(target.id, {
      onSuccess: () => {
        archiveItem({
          id: String(target.id),
          type: "offer",
          name: target.candidateName,
          detail: target.jobTitle,
        });
        setArchiveTarget(null);
        toast.success("Offer removed");
      },
      onError: (e) => {
        toast.error(e instanceof Error ? e.message : "Could not remove offer");
      },
    });
  };

  const filtered = offers.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.candidateName.toLowerCase().includes(q) ||
        o.jobTitle.toLowerCase().includes(q)) &&
      (filterDept === "all" || o.department === filterDept) &&
      (filterStatus === "all" || o.status.toLowerCase() === filterStatus)
    );
  });

  const hasFilters = search || filterDept !== "all" || filterStatus !== "all";

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Offers
        </h1>
      </div>

      <div className="border-y border-slate-300 dark:border-neutral-700 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-sm placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-[border-color] duration-200 ease-in-out"
          />
        </div>
        <Select
          value={filterDept}
          onValueChange={(v) => setFilterDept(v ?? "all")}
        >
          <SelectTrigger className="w-48 h-10! cursor-pointer bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue placeholder="Departments">
              {(
                {
                  all: "All Departments",
                  Engineering: "Engineering",
                  Design: "Design",
                  Operations: "Operations",
                } as Record<string, string>
              )[filterDept] ?? filterDept}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg w-49 shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Engineering">Engineering</SelectItem>
            <SelectItem value="Design">Design</SelectItem>
            <SelectItem value="Operations">Operations</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v ?? "all")}
        >
          <SelectTrigger className="w-40 h-10! cursor-pointer bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue placeholder="Status">
              {(
                {
                  all: "All Statuses",
                  draft: "Draft",
                  sent: "Sent",
                  pending: "Pending",
                  accepted: "Accepted",
                  declined: "Declined",
                  withdrawn: "Withdrawn",
                } as Record<string, string>
              )[filterStatus] ?? filterStatus}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg w-41 shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setFilterDept("all");
              setFilterStatus("all");
            }}
            className="text-slate-600 dark:text-neutral-400 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="px-8 py-6">
        <div className="border border-slate-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-transparent">
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Candidate Name
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Job Title
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Offer Status
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Salary Offered
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Created At
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Expired Date
                </TableHead>
                <TableHead className="h-13 px-4 w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-slate-400 text-sm"
                  >
                    No offers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow
                    key={o.id}
                    className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium hover:bg-slate-50/50 dark:hover:bg-neutral-800/50 cursor-pointer"
                    onClick={() => openOffer(o)}
                  >
                    <TableCell className="h-14 px-8 py-0 text-slate-700 dark:text-neutral-200 font-medium">
                      {o.candidateName}
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {o.jobTitle}
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0">
                      <Badge
                        className={`${OFFER_STATUS_STYLES[o.status]} hover:${OFFER_STATUS_STYLES[o.status]} border-none shadow-none font-medium px-2.5 py-0.5 rounded-full text-[12px]`}
                      >
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {o.salary ? `${o.currency} ${o.salary}` : "—"}
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {o.createdAt}
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {o.expiredDate}
                    </TableCell>
                    <TableCell
                      className="h-14 px-4 py-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowMenu onArchive={() => setArchiveTarget(o)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <span className="text-sm font-medium text-slate-400">
              {offersLoading
                ? "Loading..."
                : `Showing 1–${filtered.length} of ${filtered.length} results`}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-10 px-6 rounded-lg bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-neutral-100 shadow-none gap-2"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />{" "}
                Previous
              </Button>
              <Button
                className="h-10 px-8 rounded-lg text-white font-semibold text-sm shadow-none border-none gap-2"
                style={{ backgroundColor: "var(--theme-color)" }}
              >
                Next{" "}
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          showCloseButton={true}
          className="w-[98vw] sm:max-w-[98vw] p-0 flex flex-row gap-0 border-l border-slate-200 dark:border-neutral-800 shadow-none overflow-hidden bg-white dark:bg-neutral-950"
        >
          {selected && (
            <CandidateDetailSheetProvider key={selected.candidateId}>
              <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                <div className="px-6 lg:px-8 py-4 lg:py-5 border-b border-slate-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-950">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100 tracking-tight">
                      {selected.candidateName}
                    </h2>
                    {selected.stage && (
                      <Badge className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border-none shadow-none font-medium px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider whitespace-nowrap">
                        {selected.stage}
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-neutral-400 text-[13px] mt-0.5">
                    {selected.jobTitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1.5">
                    {[
                      [CallIcon, selected.phone],
                      [Mail01Icon, selected.email],
                    ].map(([icon, value], i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 text-[12px] font-medium hover:text-theme cursor-pointer whitespace-nowrap"
                      >
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <HugeiconsIcon
                          icon={icon as any}
                          className="size-3.5 text-slate-400"
                        />
                        <span>{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <CandidatePreviewPane
                  candidateId={selected.candidateId}
                  open={sheetOpen}
                />
              </div>

              <CandidateSidePanel
                candidateId={selected.candidateId}
                open={sheetOpen}
              />
            </CandidateDetailSheetProvider>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
              Archive this offer?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              The offer for{" "}
              <strong className="text-slate-700 dark:text-neutral-200">
                {archiveTarget?.candidateName}
              </strong>{" "}
              will be deleted permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 text-[13px] font-medium shadow-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              className="h-9 px-5 rounded-lg text-white text-[13px] font-medium shadow-none border-none"
              style={{ backgroundColor: "var(--theme-color)" }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
