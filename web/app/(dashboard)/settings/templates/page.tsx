"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search01Icon,
  PlusSignIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PencilEdit01Icon,
  Copy01Icon,
  Delete02Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

import {
  useTemplates,
  useDeleteTemplate,
  useCreateTemplate,
  useUpdateTemplate,
} from "@/hooks/use-api";
import type { Template } from "@/types";
import { toast } from "sonner";

type TemplateType = "offer" | "rejection" | "assessment" | "general";

const TYPE_META: Record<TemplateType, { label: string; badge: string }> = {
  offer: {
    label: "Offer Letter",
    badge:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  rejection: {
    label: "Rejection",
    badge:
      "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  },
  assessment: {
    label: "Assessment Invite",
    badge:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  },
  general: {
    label: "General",
    badge:
      "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
  },
};

function matchesTemplateFilter(t: Template, filterType: string) {
  if (filterType === "all") return true;
  if (filterType === "assessment") return t.type === "assessment_invite";
  return t.type === filterType;
}

/** API uses `assessment_invite`; UI meta keys use `assessment`. */
function apiTemplateTypeToUi(type: Template["type"]): TemplateType {
  if (type === "assessment_invite") return "assessment";
  return type as TemplateType;
}

export default function TemplatesPage() {
  const router = useRouter();
  const { data: templatesRes, isLoading } = useTemplates();
  const templates = templatesRes?.data || [];
  
  const createMutation = useCreateTemplate();
  const deleteMutation = useDeleteTemplate();
  const updateMutation = useUpdateTemplate();
  
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [pickedType, setPickedType] = useState<TemplateType | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deleteName = templates.find((t) => t.id === deleteId)?.name;

  const handleSetDefault = (t: Template) => {
    updateMutation.mutate(
      { id: t.id, data: { isDefault: true } },
      {
        onSuccess: () =>
          toast.success(
            `“${t.name}” is now the default ${TYPE_META[apiTemplateTypeToUi(t.type)].label} template.`,
          ),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not set default"),
      },
    );
  };

  const handleDuplicate = (t: Template) => {
    createMutation.mutate(
      {
        name: `${t.name} (Copy)`,
        type: t.type,
        subject: t.subject,
        bodyJson: t.bodyJson,
      },
      {
        onSuccess: () => toast.success("Template duplicated"),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not duplicate"),
      },
    );
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
        toast.success("Template deleted");
      },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Could not delete"),
    });
  };

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) && matchesTemplateFilter(t, filterType)
    );
  });

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Templates
        </h1>
        <button
          onClick={() => {
            setPickedType(null);
            setTypePickerOpen(true);
          }}
          className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white rounded-lg h-10 px-4 flex items-center gap-2 border-none shadow-none text-sm font-medium transition-colors"
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            className="size-4"
            strokeWidth={2.5}
          />
          <span>New Template</span>
        </button>
      </div>

      <div className="border-y border-slate-300 dark:border-neutral-700 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none"
          />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-sm placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-[border-color] duration-200 ease-in-out focus-visible:ring-0"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(val) => setFilterType(val || "")}
        >
          <SelectTrigger className="w-48 h-10! bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-4">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="offer">Offer Letter</SelectItem>
            <SelectItem value="rejection">Rejection</SelectItem>
            <SelectItem value="assessment">Assessment Invite</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>

        {(search || filterType !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setFilterType("all");
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
                <TableHead className="h-13 px-4 w-[11rem] text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-slate-400 text-sm animate-pulse"
                  >
                    Loading templates...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-slate-400 text-sm"
                  >
                    No templates found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow
                    key={t.id}
                    className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <TableCell className="h-13 px-8 py-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/settings/templates/${t.id}/edit`}
                          className="text-slate-700 dark:text-neutral-200 font-medium hover:text-[var(--theme-color)] transition-colors"
                        >
                          {t.name}
                        </Link>
                        {t.isDefault && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
                            Default
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${TYPE_META[apiTemplateTypeToUi(t.type)].badge}`}
                      >
                        {TYPE_META[apiTemplateTypeToUi(t.type)].label}
                      </span>
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      System
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="h-13 px-4 py-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Edit template"
                          aria-label="Edit template"
                          className="h-8 w-8 shrink-0 rounded-md border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 shadow-none"
                          onClick={() =>
                            router.push(`/settings/templates/${t.id}/edit`)
                          }
                        >
                          <HugeiconsIcon
                            icon={PencilEdit01Icon}
                            className="size-3.5"
                            strokeWidth={2.5}
                          />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title={
                            t.isDefault
                              ? "Already the default for this type"
                              : "Set as default template"
                          }
                          aria-label={
                            t.isDefault
                              ? "Already the default for this type"
                              : "Set as default template"
                          }
                          className="h-8 w-8 shrink-0 rounded-md border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 shadow-none disabled:opacity-50"
                          disabled={updateMutation.isPending || !!t.isDefault}
                          onClick={() => handleSetDefault(t)}
                        >
                          <HugeiconsIcon
                            icon={StarIcon}
                            className="size-3.5"
                            strokeWidth={2.5}
                          />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Duplicate template"
                          aria-label="Duplicate template"
                          className="h-8 w-8 shrink-0 rounded-md border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 shadow-none"
                          onClick={() => handleDuplicate(t)}
                          disabled={createMutation.isPending}
                        >
                          <HugeiconsIcon
                            icon={Copy01Icon}
                            className="size-3.5"
                            strokeWidth={2.5}
                          />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Delete template"
                          aria-label="Delete template"
                          className="h-8 w-8 shrink-0 rounded-md border-red-200 dark:border-red-900/50 bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 shadow-none hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => setDeleteId(t.id)}
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-3.5"
                            strokeWidth={2.5}
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <span className="text-sm font-medium text-slate-400 dark:text-neutral-500">
              Showing 1–{filtered.length} of {filtered.length} results
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-10 px-6 rounded-lg bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-neutral-800 shadow-none gap-2"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />{" "}
                Previous
              </Button>
              <Button className="h-10 px-8 rounded-lg bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-semibold text-sm shadow-none border-none gap-2">
                Next{" "}
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={typePickerOpen} onOpenChange={setTypePickerOpen}>
        <DialogContent className="!top-[20%] !translate-y-0 sm:max-w-[500px] max-w-[500px] rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-7 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-slate-900 dark:text-neutral-100">
              What type of template is this?
            </DialogTitle>
            <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-1">
              The type sets which variables are available in the builder.
            </p>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 mt-5">
            {(
              ["offer", "rejection", "assessment", "general"] as TemplateType[]
            ).map((t) => (
              <button
                key={t}
                onClick={() => setPickedType(t)}
                className={`flex flex-col items-start gap-2.5 p-4 rounded-xl border-2 text-left transition-all ${
                  pickedType === t
                    ? "border-[var(--theme-color)] bg-[var(--theme-color)]/5 dark:bg-[var(--theme-color)]/10"
                    : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
                }`}
              >
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${TYPE_META[t].badge}`}
                >
                  {TYPE_META[t].label}
                </span>
                <span className="text-[12px] text-slate-500 dark:text-neutral-400 leading-snug">
                  {t === "offer" && "Offer letters with salary & start date"}
                  {t === "rejection" &&
                    "Notify candidates who weren't selected"}
                  {t === "assessment" && "Send quiz or assessment invitations"}
                  {t === "general" && "Any other candidate communication"}
                </span>
              </button>
            ))}
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => setTypePickerOpen(false)}
              className="h-10 px-6 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 font-medium shadow-none rounded-lg text-sm"
            >
              Cancel
            </Button>
            <Button
              disabled={!pickedType}
              onClick={() => {
                if (pickedType) {
                  setTypePickerOpen(false);
                  router.push(`/settings/templates/new?type=${pickedType}`);
                }
              }}
              className="h-10 px-6 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium shadow-none rounded-lg text-sm border-none disabled:opacity-40"
            >
              Continue →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
              Delete Template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-neutral-200">{deleteName}</strong> will be
              permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[13px] font-medium shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="h-9 px-5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium shadow-none border-none disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
