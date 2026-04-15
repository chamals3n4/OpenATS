"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search01Icon,
  PlusSignIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MoreVerticalIcon,
  PencilEdit01Icon,
  Copy01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { ListSectionSpinner } from "@/components/dashboard-main-loading";
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
  useCurrentUser,
  useDeleteTemplate,
  useCreateTemplate,
} from "@/hooks/use-api";
import type { Template } from "@/types";
import {
  type EmailTemplateType,
  EMAIL_TEMPLATE_TYPE_CONFIG,
  EMAIL_TEMPLATE_TYPE_PICKER_ORDER,
} from "@/lib/email-template-types";

function RowMenu({
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onEdit(): void;
  onDuplicate(): void;
  onDelete(): void;
}) {
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
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md text-[var(--theme-color)]/50 hover:text-[var(--theme-color)] hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg shadow-lg py-1 text-sm">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800"
          >
            <HugeiconsIcon
              icon={PencilEdit01Icon}
              className="size-4 text-slate-400"
            />{" "}
            Edit
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800"
          >
            <HugeiconsIcon
              icon={Copy01Icon}
              className="size-4 text-slate-400"
            />{" "}
            Duplicate
          </button>
          <div className="border-t border-slate-100 dark:border-neutral-800 my-1" />
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const { data: meData, isLoading: meLoading } = useCurrentUser();
  const { data: templatesRes, isLoading } = useTemplates();
  const templates = templatesRes?.data || [];

  const createMutation = useCreateTemplate();
  const deleteMutation = useDeleteTemplate();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [pickedType, setPickedType] = useState<EmailTemplateType | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deleteName = templates.find((t) => t.id === deleteId)?.name;

  const handleDuplicate = (t: Template) => {
    createMutation.mutate({
      name: `${t.name} (Copy)`,
      type: t.type,
      subject: t.subject,
      bodyJson: t.bodyJson,
    });
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) &&
      (filterType === "all" || t.type === filterType)
    );
  });

  useEffect(() => {
    if (meData?.data.role === "interviewer") {
      router.replace("/");
    }
  }, [meData?.data.role, router]);

  if (meLoading || meData?.data.role === "interviewer") {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Templates
        </h1>
        <Button
          onClick={() => {
            setPickedType(null);
            setTypePickerOpen(true);
          }}
          className="bg-[var(--theme-color)] cursor-pointer hover:bg-[var(--theme-color-hover)] text-white rounded-lg h-10 px-4 flex items-center gap-2 border-none shadow-none text-sm font-medium transition-colors"
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            className="size-4"
            strokeWidth={2.5}
          />
          <span>New Template</span>
        </Button>
      </div>

      <div className="border-y border-slate-200 dark:border-neutral-800 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-sm placeholder:text-slate-300 dark:placeholder:text-neutral-600 focus-visible:border-slate-300 dark:focus-visible:border-neutral-700 focus-visible:ring-0"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(val) => setFilterType(val || "")}
        >
          <SelectTrigger className="w-48 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="rounded-lg w-49 shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Types</SelectItem>
            {EMAIL_TEMPLATE_TYPE_PICKER_ORDER.map((t) => (
              <SelectItem key={t} value={t}>
                {EMAIL_TEMPLATE_TYPE_CONFIG[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || filterType !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setFilterType("all");
            }}
            className="text-slate-600 dark:text-neutral-400 text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none"
          >
            Clear All
          </Button>
        )}
      </div>

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
                <TableHead className="h-13 px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <ListSectionSpinner />
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
                    className="border-b border-slate-200 dark:border-neutral-800 last:border-0 font-medium hover:bg-slate-50/50 dark:hover:bg-neutral-900/50"
                  >
                    <TableCell className="h-14 px-8 py-0">
                      <Link
                        href={`/settings/templates/${t.id}/edit`}
                        className="text-[var(--theme-color)] font-medium hover:underline decoration-1 underline-offset-4"
                      >
                        {t.name}
                      </Link>
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${EMAIL_TEMPLATE_TYPE_CONFIG[t.type].badge}`}
                      >
                        {EMAIL_TEMPLATE_TYPE_CONFIG[t.type].label}
                      </span>
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-[var(--theme-color)] font-normal">
                      {/* You'd display the real createdBy name here, hardcoded user ID 1 for now if needed */}
                      System
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-[var(--theme-color)] font-normal">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="h-14 px-4 py-0">
                      <RowMenu
                        onEdit={() =>
                          router.push(`/settings/templates/${t.id}/edit`)
                        }
                        onDuplicate={() => handleDuplicate(t)}
                        onDelete={() => setDeleteId(t.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <span className="text-sm font-medium text-slate-400 dark:text-neutral-500">
              Showing 1–{filtered.length} of {filtered.length} results
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
            {EMAIL_TEMPLATE_TYPE_PICKER_ORDER.map((t) => (
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
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${EMAIL_TEMPLATE_TYPE_CONFIG[t].badge}`}
                >
                  {EMAIL_TEMPLATE_TYPE_CONFIG[t].label}
                </span>
                <span className="text-[12px] text-slate-500 dark:text-neutral-400 leading-snug">
                  {EMAIL_TEMPLATE_TYPE_CONFIG[t].description}
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
              <strong className="text-slate-700 dark:text-neutral-200">
                {deleteName}
              </strong>{" "}
              will be permanently removed. This cannot be undone.
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
