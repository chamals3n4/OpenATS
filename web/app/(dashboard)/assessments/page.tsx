"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search01Icon,
  PlusSignIcon,
  Delete02Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const INITIAL_ASSESSMENTS = [
  {
    id: "a1",
    title: "Frontend Developer L01",
    status: "Active",
    difficulty: "Easy",
    questions: 10,
    duration: 120,
  },
  {
    id: "a2",
    title: "Frontend Developer L01",
    status: "Active",
    difficulty: "Easy",
    questions: 10,
    duration: 120,
  },
  {
    id: "a3",
    title: "Frontend Developer L01",
    status: "Active",
    difficulty: "Easy",
    questions: 10,
    duration: 120,
  },
  {
    id: "a4",
    title: "Frontend Developer L01",
    status: "Active",
    difficulty: "Easy",
    questions: 10,
    duration: 120,
  },
  {
    id: "a5",
    title: "Frontend Developer L01",
    status: "Active",
    difficulty: "Easy",
    questions: 10,
    duration: 120,
  },
  {
    id: "a6",
    title: "Frontend Developer L01",
    status: "Active",
    difficulty: "Easy",
    questions: 10,
    duration: 120,
  },
];

function CardMenu({ onDelete }: { onDelete(): void }) {
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
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className="size-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 ml-auto"
      >
        <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm">
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState(INITIAL_ASSESSMENTS);
  const [deleteTarget, setDeleteTarget] = useState<
    (typeof INITIAL_ASSESSMENTS)[0] | null
  >(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyPreviewLink = (id: string) => {
    const url = `${window.location.origin}/assessment/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setAssessments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 leading-none">
          Assessments
        </h1>
        <Link
          href="assessment/new"
          className="inline-flex items-center gap-2 text-white rounded-lg h-10 px-4 border-none shadow-none text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--theme-color)" }}
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            className="size-4"
            strokeWidth={2.5}
          />
          <span>Add New Assessment</span>
        </Link>
      </div>

      <div className="border-y border-slate-200 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-72">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none"
          />
          <Input
            placeholder="Search"
            className="pl-10 h-10! bg-white border-slate-200 shadow-none rounded-lg text-sm placeholder:text-slate-400 transition-[border-color] duration-200 ease-in-out"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Select>
            <SelectTrigger className="w-36 h-10! bg-white border-slate-200 shadow-none rounded-lg text-slate-500 text-sm focus:ring-0 px-4">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg border-slate-200">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            className="text-slate-500 font-medium text-sm h-10 px-3 hover:bg-transparent hover:text-slate-900"
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="px-8 py-6">
        {assessments.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            No assessments found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                className="border border-slate-200 rounded-xl bg-white p-6 flex flex-col gap-4 hover:border-slate-300 transition-all"
              >
                <div className="space-y-2">
                  <h3 className="text-[15px] font-semibold text-slate-900 leading-snug">
                    {assessment.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#E6F4EA] text-[#1E8E3E] border-none shadow-none font-medium text-[11px] px-2.5 py-0.5 rounded-full">
                      {assessment.status}
                    </Badge>
                    <Badge className="bg-[#EEF2FF] text-[#4338CA] border-none shadow-none font-medium text-[11px] px-2.5 py-0.5 rounded-full">
                      {assessment.difficulty}
                    </Badge>
                  </div>
                </div>
                <p className="text-[13px] text-slate-500 font-medium">
                  {assessment.questions} Questions · {assessment.duration}{" "}
                  Minutes
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={() => copyPreviewLink(assessment.id)}
                    className={`text-[13px] font-medium h-9 px-5 rounded-lg shadow-none border-none gap-2 transition-all active:scale-[0.98] ${copiedId === assessment.id ? "bg-emerald-500 text-white" : "text-white"}`}
                    style={
                      copiedId === assessment.id
                        ? {}
                        : { backgroundColor: "var(--theme-color)" }
                    }
                  >
                    {copiedId === assessment.id ? "Link Copied!" : "Preview"}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-slate-600 text-[13px] font-medium h-9 px-4 rounded-lg shadow-none border-slate-200 hover:bg-slate-50 hover:text-slate-900 gap-2 transition-all"
                  >
                    Edit
                  </Button>
                  <CardMenu onDelete={() => setDeleteTarget(assessment)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-900">
              Delete Assessment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 leading-relaxed">
              <strong className="text-slate-700">{deleteTarget?.title}</strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 text-slate-600 text-[13px] font-medium shadow-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="h-9 px-5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium shadow-none border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
