"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search01Icon,
  PlusSignIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MoreVerticalIcon,
  Archive01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { ThemeButton } from "@/components/theme-button";
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
import { archiveItem } from "@/lib/archive-store";

const INITIAL_JOBS = [
  {
    id: "j1",
    name: "Software Engineer - Internship",
    type: "Full Time",
    department: "API Management",
    location: "Kegalle, Srilanka",
    createdAt: "14/02/2026",
  },
  {
    id: "j2",
    name: "Software Engineer - Internship",
    type: "Full Time",
    department: "API Management",
    location: "Colombo, Srilanka",
    createdAt: "14/02/2026",
  },
  {
    id: "j3",
    name: "Software Engineer - Internship",
    type: "Full Time",
    department: "API Management",
    location: "Colombo, Srilanka",
    createdAt: "14/02/2026",
  },
  {
    id: "j4",
    name: "Software Engineer - Internship",
    type: "Full Time",
    department: "API Management",
    location: "Colombo, Srilanka",
    createdAt: "14/02/2026",
  },
  {
    id: "j5",
    name: "Software Engineer - Internship",
    type: "Full Time",
    department: "API Management",
    location: "Colombo, Srilanka",
    createdAt: "14/02/2026",
  },
  {
    id: "j6",
    name: "Software Engineer - Internship",
    type: "Full Time",
    department: "API Management",
    location: "Colombo, Srilanka",
    createdAt: "14/02/2026",
  },
];

function RowMenu({ onArchive }: { onArchive(): void }) {
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
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm">
          <button
            onClick={() => {
              setOpen(false);
              onArchive();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50"
          >
            <HugeiconsIcon
              icon={Archive01Icon}
              className="size-4 text-slate-400"
            />
            Archive
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManageJobsPage() {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [archiveTarget, setArchiveTarget] = useState<
    (typeof INITIAL_JOBS)[0] | null
  >(null);

  const confirmArchive = () => {
    if (!archiveTarget) return;
    archiveItem({
      id: archiveTarget.id,
      type: "job",
      name: archiveTarget.name,
      detail: archiveTarget.department,
    });
    setJobs((prev) => prev.filter((j) => j.id !== archiveTarget.id));
    setArchiveTarget(null);
  };

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 leading-none">
          Manage Jobs
        </h1>
        <ThemeButton
          asChild
          href="jobs/new"
          className="h-10 px-4 gap-2 text-sm shadow-none border-none"
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            className="size-4"
            strokeWidth={2.5}
          />
          <span>Create New Job</span>
        </ThemeButton>
      </div>

      <div className="border-y border-slate-200 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none"
          />
          <Input
            placeholder="Search"
            className="pl-11 h-10! bg-white border-slate-200 shadow-none rounded-lg text-sm placeholder:text-slate-300 transition-[border-color] duration-200 ease-in-out"
          />
        </div>
        <Select>
          <SelectTrigger className="w-52 h-10! bg-white border-slate-200 shadow-none rounded-lg text-slate-500 text-sm focus:ring-0 px-4">
            <SelectValue placeholder="Departments" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200">
            <SelectItem value="api">API Management</SelectItem>
            <SelectItem value="eng">Engineering</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-44 h-10! bg-white border-slate-200 shadow-none rounded-lg text-slate-500 text-sm focus:ring-0 px-4">
            <SelectValue placeholder="Job Types" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200">
            <SelectItem value="fulltime">Full Time</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          className="text-slate-600 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 border-none ml-4"
        >
          Clear All
        </Button>
      </div>

      <div className="px-8 py-6">
        <div className="border border-slate-200 rounded-xl bg-white shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-white hover:bg-transparent">
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Job Name
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Job Type
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Department Name
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Location
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Created At
                </TableHead>
                <TableHead className="h-13 px-4 w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-slate-400 text-sm"
                  >
                    No jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="border-b border-slate-200 last:border-0 font-medium"
                  >
                    <TableCell className="h-13 px-8 py-0">
                      <Link
                        href={`jobs/${job.id}`}
                        className="text-slate-700 font-medium hover:underline decoration-1 underline-offset-4 cursor-pointer"
                      >
                        {job.name}
                      </Link>
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 font-normal">
                      {job.type}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 font-normal">
                      {job.department}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 font-normal">
                      {job.location}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 font-normal">
                      {job.createdAt}
                    </TableCell>
                    <TableCell className="h-13 px-4 py-0">
                      <RowMenu onArchive={() => setArchiveTarget(job)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-200 bg-white">
            <span className="text-sm font-medium text-slate-400">
              Showing 1-{jobs.length} of {jobs.length} results
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-10 px-6 rounded-lg bg-white border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:text-slate-900 shadow-none gap-2"
              >
                Previous
              </Button>
              <Button
                className="h-10 px-8 rounded-lg text-white font-semibold text-sm shadow-none transition-all active:scale-[0.98] border-none"
                style={{ backgroundColor: "var(--theme-color)" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-900">
              Archive this job?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 leading-relaxed">
              <strong className="text-slate-700">{archiveTarget?.name}</strong>{" "}
              will be moved to the Archive. You can permanently delete it from
              Settings → Archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 text-slate-600 text-[13px] font-medium shadow-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              className="h-9 px-5 rounded-lg text-white text-[13px] font-medium shadow-none border-none"
              style={{ backgroundColor: "var(--theme-color)" }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
