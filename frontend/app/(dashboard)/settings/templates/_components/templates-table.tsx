"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import type { Template } from "@/types";
import { TemplateTableRow } from "./template-table-row";

interface TemplatesTableProps {
  templates: Template[];
  isLoading: boolean;
  onRowClick: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (id: number) => void;
}

export function TemplatesTable({
  templates,
  isLoading,
  onRowClick,
  onDuplicate,
  onDelete,
}: TemplatesTableProps) {
  return (
    <div className="px-8 py-6">
      <div className="border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 shadow-none overflow-hidden text-[var(--theme-color)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-transparent">
              <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Template Name
              </TableHead>
              <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Type
              </TableHead>
              <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Created By
              </TableHead>
              <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Last Edited
              </TableHead>
              <TableHead className="h-13 px-4 w-44 text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <ListSectionSpinner />
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-slate-400 text-sm"
                >
                  No templates found.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TemplateTableRow
                  key={template.id}
                  template={template}
                  onRowClick={onRowClick}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                />
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <span className="text-sm font-medium text-slate-400 dark:text-neutral-500">
            Showing 1–{templates.length} of {templates.length} results
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-10 px-6 rounded-lg bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-[var(--theme-color)] font-semibold text-sm hover:bg-slate-50 dark:hover:bg-neutral-800 shadow-none gap-2"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />{" "}
              Previous
            </Button>
            <Button className="h-10 px-8 rounded-lg bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-semibold text-sm shadow-none border-none gap-2">
              Next <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
