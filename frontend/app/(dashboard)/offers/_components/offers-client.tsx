"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOffersList, useDeleteOffer, useBulkDeleteOffers } from "@/hooks/queries/use-offers";
import { useJobs } from "@/hooks/queries/use-jobs";
import type { Offer } from "@/types";
import { OfferFilters } from "./offer-filters";
import { OffersTable } from "./offers-table";
import { OfferDeleteDialog } from "./delete-dialog";

const PAGE_LIMIT = 15;

export default function OffersPageClient() {
  const router = useRouter();

  // ── Filter State ───────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 150);
    return () => clearTimeout(t);
  }, [search]);

  // ── Data ───────────────────────────────────────────────────
  const { data: offersRes, isLoading } = useOffersList({
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    jobId: selectedJobId,
  });
  const { data: jobsData } = useJobs();

  const offers = offersRes?.data ?? [];
  const pagination = offersRes?.pagination;
  const jobs = jobsData?.data ?? [];

  // ── Delete ─────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const deleteMutation = useDeleteOffer();
  const bulkDeleteMutation = useBulkDeleteOffers();

  const handleDeleteSelected = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return false;
      await bulkDeleteMutation.mutateAsync(ids);
    },
    [bulkDeleteMutation],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

  // ── Navigation ─────────────────────────────────────────────
  const handleRowClick = useCallback(
    (offer: Offer) => {
      router.push(`/candidates/${offer.candidateId}?from=offers`);
    },
    [router],
  );

  const handleSearchChange = useCallback((v: string) => { setSearch(v); }, []);
  const handleJobChange = useCallback((v: number | undefined) => { setSelectedJobId(v); setPage(1); }, []);
  const handleStatusChange = useCallback((v: string) => { setStatusFilter(v); setPage(1); }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSelectedJobId(undefined);
    setStatusFilter("all");
    setPage(1);
  }, []);

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-white dark:bg-neutral-950">
      <div className="flex-shrink-0 px-6 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Offers
        </h1>
      </div>

      <div className="flex-shrink-0">
        <OfferFilters
          search={search}
          onSearchChange={handleSearchChange}
          selectedJobId={selectedJobId}
          onJobChange={handleJobChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          jobs={jobs}
          onClear={handleClearFilters}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <OffersTable
          offers={offers}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          onDelete={setDeleteTarget}
          onDeleteSelected={handleDeleteSelected}
          isDeletingSelected={bulkDeleteMutation.isPending}
          pagination={pagination}
          onPageChange={setPage}
        />
      </div>

      <OfferDeleteDialog
        offer={deleteTarget}
        isOpen={!!deleteTarget}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
