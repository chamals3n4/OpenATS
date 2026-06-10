"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOffers, useDeleteOffer } from "@/hooks/queries/use-offers";
import { useJobs } from "@/hooks/queries/use-jobs";
import type { Offer } from "@/types";
import { OfferFilters } from "./offer-filters";
import { OffersTable } from "./offers-table";
import { OfferDeleteDialog } from "./delete-dialog";
import { getCandidateName } from "../lib/offer-utils";

export default function OffersPageClient() {
  const router = useRouter();

  // ── Data ───────────────────────────────────────────────────
  const { data: offersRes, isLoading } = useOffers();
  const { data: jobsData } = useJobs();
  const deleteMutation = useDeleteOffer();

  const offers: Offer[] = offersRes?.data ?? [];
  const jobs = jobsData?.data ?? [];

  // ── Filter State ───────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ── Filter Logic ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return offers.filter((o) => {
      const candidateName = getCandidateName(o as any).toLowerCase();
      const matchesSearch = !q || candidateName.includes(q);
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesJob =
        selectedJobId === undefined || (o as any).job?.id === selectedJobId;
      return matchesSearch && matchesStatus && matchesJob;
    });
  }, [offers, search, statusFilter, selectedJobId]);

  // ── Delete ─────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);

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

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSelectedJobId(undefined);
    setStatusFilter("all");
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Offers
        </h1>
      </div>

      <OfferFilters
        search={search}
        onSearchChange={setSearch}
        selectedJobId={selectedJobId}
        onJobChange={setSelectedJobId}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        jobs={jobs}
        onClear={handleClearFilters}
      />

      <OffersTable
        offers={filtered}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        onDelete={setDeleteTarget}
      />

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
