"use client";

import { useState } from "react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useOffers, useDeleteOffer } from "@/hooks/queries/use-offers";
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
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  sent: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  viewed:
    "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
  accepted:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  declined: "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400",
  expired:
    "bg-slate-50 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400",
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
  const { data: offersRes, isLoading } = useOffers();
  const deleteMutation = useDeleteOffer();

  const offers: Offer[] = offersRes?.data ?? [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const filtered = offers.filter((o) => {
    const q = search.toLowerCase();
    const name =
      `${(o as any).candidate?.firstName ?? ""} ${(o as any).candidate?.lastName ?? ""}`
        .trim()
        .toLowerCase();
    const job = ((o as any).job?.title ?? "").toLowerCase();
    const matchesSearch = !q || name.includes(q) || job.includes(q);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold leading-tight text-slate-950 dark:text-neutral-50">
                Offers
              </h1>
              <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-neutral-400">
                {filtered.length} offer{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search candidate or job…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-sm"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-40 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="text-[13px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-neutral-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-2.5 text-slate-400">
                <div className="size-4 border-2 border-slate-300 dark:border-neutral-600 border-t-slate-400 rounded-full animate-spin" />
                <p className="text-sm font-medium">Loading…</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-6 py-16 text-center">
              <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
                No offers found
              </p>
              <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
                Offers will appear here when candidates reach an offer stage.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-neutral-800 hover:bg-transparent">
                    <TableHead className="h-12 px-5 text-[12px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                      Candidate
                    </TableHead>
                    <TableHead className="h-12 px-5 text-[12px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                      Job
                    </TableHead>
                    <TableHead className="h-12 px-5 text-[12px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider text-center">
                      Status
                    </TableHead>
                    <TableHead className="h-12 px-5 text-[12px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                      Salary
                    </TableHead>
                    <TableHead className="h-12 px-5 text-[12px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                      Sent
                    </TableHead>
                    <TableHead className="h-12 px-5 w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                    <TableRow
                      key={o.id}
                      className="border-b border-slate-100 dark:border-neutral-800 last:border-0 hover:bg-slate-50 dark:hover:bg-neutral-900"
                    >
                      <TableCell className="h-14 px-5 py-0">
                        <Link
                          href={`/candidates/${o.candidateId}?from=offers`}
                          className="text-[14px] font-semibold text-slate-800 dark:text-neutral-200 hover:text-[var(--theme-color)]"
                        >
                          {(o as any).candidate?.firstName ?? ""}{" "}
                          {(o as any).candidate?.lastName ?? ""}
                        </Link>
                      </TableCell>
                      <TableCell className="h-14 px-5 py-0 text-[13px] text-slate-500 dark:text-neutral-400">
                        {(o as any).job?.title ?? "—"}
                      </TableCell>
                      <TableCell className="h-14 px-5 py-0 text-center">
                        <Badge
                          className={`${STATUS_STYLES[o.status] ?? STATUS_STYLES.draft} border-none shadow-none font-bold px-2.5 py-0.5 rounded-md text-[11px] uppercase tracking-wider`}
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-14 px-5 py-0 text-[13px] text-slate-600 dark:text-neutral-400">
                        {fmtSalary(o)}
                      </TableCell>
                      <TableCell className="h-14 px-5 py-0 text-[13px] text-slate-500 dark:text-neutral-400">
                        {fmtDate(o.sentAt)}
                      </TableCell>
                      <TableCell className="h-14 px-5 py-0">
                        <button
                          onClick={() => setDeleteTarget(o.id)}
                          className="text-slate-300 dark:text-neutral-600 hover:text-red-500 transition-colors text-[11px]"
                        >
                          Delete
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg p-0 overflow-hidden">
          <AlertDialogHeader className="px-6 pt-6 pb-4">
            <AlertDialogTitle className="text-[17px] font-bold text-slate-900 dark:text-neutral-100">
              Delete offer?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed mt-1">
              This will permanently delete this offer record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 pb-6 pt-0 gap-2">
            <AlertDialogCancel className="h-9 rounded-md border-none bg-neutral-800 px-3.5 text-[13px] font-semibold text-white shadow-none transition-colors hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget !== null) {
                  deleteMutation.mutate(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="h-9 rounded-md border-none bg-red-600 px-3.5 text-[13px] font-semibold text-white shadow-none hover:bg-red-500 cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
