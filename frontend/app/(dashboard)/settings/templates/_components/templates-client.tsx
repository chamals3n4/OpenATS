"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useTemplates,
  useDeleteTemplate,
  useCreateTemplate,
} from "@/hooks/queries/use-templates";
import type { Template } from "@/types";
import { TemplatesHeader } from "./templates-header";
import { TemplatesFilters } from "./templates-filters";
import { TemplatesTable } from "./templates-table";
import { TemplateTypePicker } from "./type-picker";
import { TemplateDeleteDialog } from "./delete-dialog";

export default function TemplatesPageClient() {
  const router = useRouter();
  const { data: templatesRes, isLoading } = useTemplates();
  const templates = templatesRes?.data ?? [];

  const createMutation = useCreateTemplate();
  const deleteMutation = useDeleteTemplate();

  // ── Filter State ───────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return templates.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(q);
      const matchesType = filterType === "all" || t.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [templates, search, filterType]);

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
      router.push(`/settings/templates/new?type=${pickedType}`);
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

  // ── Delete ─────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deleteTarget = templates.find((t) => t.id === deleteId) ?? null;

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  }, [deleteId, deleteMutation]);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setFilterType("all");
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <TemplatesHeader onNewTemplate={handleOpenTypePicker} />

      <TemplatesFilters
        search={search}
        onSearchChange={setSearch}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        onClear={handleClearFilters}
      />

      <TemplatesTable
        templates={filtered}
        isLoading={isLoading}
        onRowClick={(template) =>
          router.push(`/settings/templates/${template.id}/edit`)
        }
        onDuplicate={handleDuplicate}
        onDelete={setDeleteId}
      />

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
