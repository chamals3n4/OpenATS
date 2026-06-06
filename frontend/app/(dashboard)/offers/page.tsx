"use client";

import { useState } from "react";
import { Search01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useOffers, useDeleteOffer } from "@/hooks/queries/use-offers";
import { useJobs } from "@/hooks/queries/use-jobs";
import type { Offer } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  sent: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  viewed: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  accepted: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  declined: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
  },
  expired: {
    bg: "bg-slate-100 dark:bg-neutral-800",
    text: "text-slate-500 dark:text-neutral-400",
  },
};

function fmtSalary(offer: Offer): string {
  if (!offer.salary) return "—";
  return `${offer.currency ?? ""} ${Number(offer.salary).toLocaleString()}`.trim();
}

function fmtDate(val: string | null): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ManageOffersPage() {
  const router = useRouter();
  const { data: offersRes, isLoading } = useOffers();
  const { data: jobsData } = useJobs();
  const deleteMutation = useDeleteOffer();

  const offers: Offer[] = offersRes?.data ?? [];
  const jobs = jobsData?.data ?? [];

  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);

  const filtered = offers.filter((o) => {
    const q = search.toLowerCase();
    const candidateName =
      `${(o as any).candidate?.firstName ?? ""} ${(o as any).candidate?.lastName ?? ""}`
        .trim()
        .toLowerCase();
    const matchesSearch = !q || candidateName.includes(q);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesJob =
      selectedJobId === undefined || (o as any).job?.id === selectedJobId;
    return matchesSearch && matchesStatus && matchesJob;
  });

  const handleRowClick = (o: Offer) => {
    router.push(`/candidates/${o.candidateId}?from=offers`);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  const statusStyle = (status: string) =>
    STATUS_BADGE[status] ?? STATUS_BADGE.draft;

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Offers
        </h1>
      </div>

      {/* Filters */}
      <div className="border-y border-slate-300 dark:border-neutral-700 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search Candidate"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
          />
        </div>

        <Select
          value={selectedJobId ? String(selectedJobId) : "all"}
          onValueChange={(v) =>
            setSelectedJobId(v === "all" ? undefined : Number(v))
          }
        >
          <SelectTrigger className="w-62 h-10! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
            <SelectValue placeholder="Job Position">
              {selectedJobId
                ? (jobs.find((j) => j.id === selectedJobId)?.title ?? null)
                : "All Positions"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Positions</SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={String(j.id)}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-44 h-10! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          onClick={() => {
            setSearch("");
            setSelectedJobId(undefined);
            setStatusFilter("all");
          }}
          className="text-slate-600 cursor-pointer dark:text-neutral-400 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none ml-2"
        >
          Clear All
        </Button>
      </div>

      {/* Table */}
      <div className="px-8 py-6">
        <div className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-none dark:border-neutral-700 dark:bg-neutral-900">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-transparent">
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Candidate Name
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Status
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Applied for
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Salary
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Sent on
                </TableHead>
                <TableHead className="h-13 px-4 w-44 text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <ListSectionSpinner />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-slate-400 text-sm"
                  >
                    No offers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => {
                  const { bg, text } = statusStyle(o.status);
                  return (
                    <TableRow
                      key={o.id}
                      className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
                      onClick={() => handleRowClick(o)}
                    >
                      <TableCell className="h-13 px-8 py-0 font-medium text-slate-700 dark:text-neutral-200">
                        {(o as any).candidate?.firstName ?? ""}{" "}
                        {(o as any).candidate?.lastName ?? ""}
                      </TableCell>
                      <TableCell className="h-13 px-8 py-0">
                        <Badge
                          className={`${bg} ${text} hover:${bg} border-none shadow-none font-medium px-2.5 py-0.5 rounded-full text-[12px]`}
                        >
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-13 px-8 py-0 text-slate-500 dark:text-neutral-400 font-normal">
                        {(o as any).job?.title ?? "—"}
                      </TableCell>
                      <TableCell className="h-13 px-8 py-0 text-slate-500 dark:text-neutral-400 font-normal">
                        {fmtSalary(o)}
                      </TableCell>
                      <TableCell className="h-13 px-8 py-0 text-slate-500 dark:text-neutral-400 font-normal">
                        {fmtDate(o.sentAt)}
                      </TableCell>
                      <TableCell
                        className="h-13 px-4 py-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-[34px] rounded-md border-none bg-red-600/90 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 dark:bg-red-700/90 dark:hover:bg-red-600 cursor-pointer"
                            onClick={() => setDeleteTarget(o)}
                          >
                            <HugeiconsIcon
                              icon={Delete02Icon}
                              className="size-4"
                            />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <span className="text-sm font-medium text-slate-400 dark:text-neutral-500">
              {isLoading
                ? "Loading..."
                : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
              Delete this offer?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              The offer for{" "}
              <strong className="text-slate-700 dark:text-neutral-200">
                {deleteTarget
                  ? `${(deleteTarget as any).candidate?.firstName ?? ""} ${(deleteTarget as any).candidate?.lastName ?? ""}`.trim()
                  : ""}
              </strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-[34px] rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="h-[34px] rounded-md border-none bg-red-600 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {deleteMutation.isPending && <Spinner className="size-3.5" />}
              {deleteMutation.isPending ? "Deleting" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
