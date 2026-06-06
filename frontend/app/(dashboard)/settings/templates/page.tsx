"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search01Icon,
  PlusSignIcon,
  Delete02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
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
  useDeleteTemplate,
  useCreateTemplate,
} from "@/hooks/queries/use-templates";
import type { Template } from "@/types";
import { Spinner } from "@/components/ui/spinner";

type TemplateType = "email" | "event";

const TYPE_META: Record<TemplateType, { label: string; badge: string }> = {
  email: {
    label: "Email",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  event: {
    label: "Interview Event",
    badge: "bg-purple-50 text-purple-700 border border-purple-200",
  },
};

export default function TemplatesPage() {
  const router = useRouter();
  const { data: templatesRes, isLoading } = useTemplates();
  const templates = templatesRes?.data || [];

  const createMutation = useCreateTemplate();
  const deleteMutation = useDeleteTemplate();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [pickedType, setPickedType] = useState<TemplateType | null>(null);

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
            className="pl-11 h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(val) => setFilterType(val || "")}
        >
          <SelectTrigger className="w-48 h-10! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="rounded-lg w-49 shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="event">Interview Event</SelectItem>
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
                    onClick={() =>
                      router.push(`/settings/templates/${t.id}/edit`)
                    }
                    className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer hover:bg-slate-50/50 dark:hover:bg-neutral-900/50"
                  >
                    <TableCell className="h-13 px-8 py-0">
                      <span className="text-slate-700 dark:text-neutral-300 font-medium">
                        {t.name}
                      </span>
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${(TYPE_META[t.type as TemplateType] ?? { badge: "bg-slate-100 text-slate-600 border border-slate-200" }).badge}`}
                      >
                        {
                          (
                            TYPE_META[t.type as TemplateType] ?? {
                              label: "Unknown",
                            }
                          ).label
                        }
                      </span>
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      System
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell
                      className="h-13 px-4 py-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="h-9 rounded-md border border-slate-300 dark:border-neutral-600 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-900/50 px-4 text-sm font-semibold leading-none text-slate-700 dark:text-neutral-300 shadow-none cursor-pointer"
                          onClick={() => handleDuplicate(t)}
                        >
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          className="h-[34px] rounded-md border-none bg-red-500 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
                          onClick={() => setDeleteId(t.id)}
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-3.5 mr-1"
                          />
                          Delete
                        </Button>
                      </div>
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
            {(["email", "event"] as TemplateType[]).map((t) => (
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
                  {t === "email" && "Send emails to candidates"}
                  {t === "event" &&
                    "Interview scheduling with time slots & calendar sync"}
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
            <AlertDialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
              Delete Template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-neutral-200">
                {deleteName}
              </strong>{" "}
              will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-[34px] rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
