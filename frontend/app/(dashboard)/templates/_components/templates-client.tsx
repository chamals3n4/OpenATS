"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useTemplatesList,
  useDeleteTemplate,
  useCreateTemplate,
  useBulkDeleteTemplates,
} from "@/hooks/queries/use-templates";
import type { Template } from "@/types";
import { TemplatesHeader } from "./templates-header";
import { TemplatesFilters } from "./templates-filters";
import { TemplatesTable } from "./templates-table";
import { TemplateTypePicker } from "./type-picker";
import { TemplateDeleteDialog } from "./delete-dialog";

const PAGE_LIMIT = 15;

export default function TemplatesPageClient() {
  const router = useRouter();

  // ── Filter State ───────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: templatesRes, isLoading } = useTemplatesList({
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    type: filterType === "all" ? undefined : filterType,
  });

  const templates = templatesRes?.data ?? [];
  const pagination = templatesRes?.pagination;

  const createMutation = useCreateTemplate();
  const deleteMutation = useDeleteTemplate();
  const bulkDeleteMutation = useBulkDeleteTemplates();

  // ── Type Picker (New Template) ───────────────────────────
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [pickedType, setPickedType] = useState<string | null>(null);

  const handleOpenTypePicker = useCallback(() => {
    setPickedType(null);
    setTypePickerOpen(true);
  }, []);

  const handleContinue = useCallback(() => {
    if (pickedType) {
      setTypePickerOpen(false);
      router.push(`/templates/new?type=${pickedType}`);
    }
  }, [pickedType, router]);

  // ── Duplicate ──────────────────────────────────────────────
  const handleDuplicate = useCallback(
    (template: Template) => {
      createMutation.mutate({
        name: `${template.name} (Copy)`,
        type: template.type,
        subject: template.subject,
        bodyJson: template.bodyJson,
      });
    },
    [createMutation],
  );

  // ── Bulk Delete ────────────────────────────────────────────
  const handleDeleteSelected = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return false;
      await bulkDeleteMutation.mutateAsync(ids);
    },
    [bulkDeleteMutation],
  );

  // ── Single Delete ──────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deleteTarget = templates.find((t) => t.id === deleteId) ?? null;

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  }, [deleteId, deleteMutation]);

  const handleSearchChange = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const handleTypeChange = useCallback((v: string) => { setFilterType(v); setPage(1); }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setFilterType("all");
    setPage(1);
  }, []);

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-white dark:bg-neutral-950">
      <TemplatesHeader onNewTemplate={handleOpenTypePicker} />

      <div className="flex-shrink-0">
        <TemplatesFilters
          search={search}
          onSearchChange={handleSearchChange}
          filterType={filterType}
          onFilterTypeChange={handleTypeChange}
          onClear={handleClearFilters}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <TemplatesTable
          templates={templates}
          isLoading={isLoading}
          onRowClick={(template) => router.push(`/templates/${template.id}/edit`)}
          onDuplicate={handleDuplicate}
          onDelete={setDeleteId}
          onDeleteSelected={handleDeleteSelected}
          isDeletingSelected={bulkDeleteMutation.isPending}
          pagination={pagination}
          onPageChange={setPage}
        />
      </div>

      <TemplateTypePicker
        isOpen={typePickerOpen}
        pickedType={pickedType}
        onPickType={setPickedType}
        onClose={() => setTypePickerOpen(false)}
        onContinue={handleContinue}
      />

      <TemplateDeleteDialog
        template={deleteTarget}
        isOpen={deleteId !== null}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
