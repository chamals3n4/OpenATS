"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search01Icon,
  PencilEdit01Icon,
  Delete02Icon,
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
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useCandidates,
  useDeleteCandidate,
  useUpdateCandidateBasicDetails,
} from "@/hooks/queries/use-candidates";
import { useJobs } from "@/hooks/queries/use-jobs";
import type { Candidate } from "@/types";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ManageCandidatesPage() {
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [editTarget, setEditTarget] = useState<Candidate | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editResumeFile, setEditResumeFile] = useState<File | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: candidatesData, isLoading } = useCandidates(selectedJobId, {
    search: debouncedSearch || undefined,
  });
  const { data: jobsData } = useJobs();
  const deleteMutation = useDeleteCandidate();
  const updateMutation = useUpdateCandidateBasicDetails();

  const candidates = candidatesData?.data ?? [];
  const jobs = jobsData?.data ?? [];

  const handleRowClick = (c: Candidate) => {
    router.push(`/candidates/${c.id}`);
  };

  const openEditDialog = (candidate: Candidate) => {
    setEditTarget(candidate);
    setEditFirstName(candidate.firstName);
    setEditLastName(candidate.lastName);
    setEditEmail(candidate.email);
    setEditPhone(candidate.phone ?? "");
    setEditResumeFile(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  const confirmUpdate = () => {
    if (!editTarget) return;

    const formData = new FormData();
    formData.append("firstName", editFirstName.trim());
    formData.append("lastName", editLastName.trim());
    formData.append("email", editEmail.trim());
    formData.append("phone", editPhone.trim());

    if (editResumeFile) {
      formData.append("resume", editResumeFile);
    }

    updateMutation.mutate(
      {
        id: editTarget.id,
        formData,
      },
      {
        onSuccess: () => {
          setEditTarget(null);
          setEditResumeFile(null);
        },
      },
    );
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Candidates
        </h1>
      </div>

      {/* Filters */}
      <div className="border-y border-slate-300 dark:border-neutral-700 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search Candidate"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-sm placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-[border-color] duration-200 ease-in-out"
          />
        </div>

        <Select
          value={selectedJobId ? String(selectedJobId) : "all"}
          onValueChange={(v) =>
            setSelectedJobId(v === "all" ? undefined : Number(v))
          }
        >
          <SelectTrigger className="w-62 h-10! bg-white cursor-pointer dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue placeholder="Job Position">
              {selectedJobId
                ? (jobs.find((j) => j.id === selectedJobId)?.title ?? null)
                : "All Positions"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Positions</SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={String(j.id)}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          onClick={() => {
            setSearch("");
            setSelectedJobId(undefined);
          }}
          className="text-slate-600 cursor-pointer dark:text-neutral-400 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none ml-2"
        >
          Clear All
        </Button>
      </div>

      {/* Table */}
      <div className="px-8 py-6">
        <div className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-none dark:border-neutral-700 dark:bg-neutral-900">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-transparent">
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Candidate Name
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Stage
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Applied for
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Applied on
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
              ) : candidates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-slate-400 text-sm"
                  >
                    No candidates found.
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
                    onClick={() => handleRowClick(c)}
                  >
                    <TableCell className="h-13 px-8 py-0 font-medium text-slate-700 dark:text-neutral-200">
                      {c.firstName} {c.lastName}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0">
                      {c.stageName ? (
                        <Badge className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border-none shadow-none font-medium px-2.5 py-0.5 rounded-full text-[12px]">
                          {c.stageName}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-500 dark:text-neutral-400 font-normal">
                      {c.jobTitle ?? "—"}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-500 dark:text-neutral-400 font-normal">
                      {timeAgo(c.appliedAt)}
                    </TableCell>
                    <TableCell
                      className="h-13 px-4 py-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="h-[34px] rounded-md border-none bg-neutral-700/90 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 cursor-pointer"
                          onClick={() => openEditDialog(c)}
                        >
                          <HugeiconsIcon
                            icon={PencilEdit01Icon}
                            className="size-4"
                          />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          className="h-[34px] rounded-md border-none bg-red-600/90 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 dark:bg-red-700/90 dark:hover:bg-red-600 cursor-pointer"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-4"
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

          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <span className="text-sm font-medium text-slate-400 dark:text-neutral-500">
              {isLoading
                ? "Loading..."
                : `${candidates.length} result${candidates.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>
      </div>

      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent className="max-w-lg rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
              Edit Candidate
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5">
                First name
              </p>
              <Input
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="h-10 rounded-lg border-slate-200 dark:border-neutral-800"
              />
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5">
                Last name
              </p>
              <Input
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="h-10 rounded-lg border-slate-200 dark:border-neutral-800"
              />
            </div>

            <div className="col-span-2">
              <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5">
                Email
              </p>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-10 rounded-lg border-slate-200 dark:border-neutral-800"
              />
            </div>

            <div className="col-span-2">
              <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5">
                Phone
              </p>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-10 rounded-lg border-slate-200 dark:border-neutral-800"
                placeholder="Optional"
              />
            </div>

            <div className="col-span-2">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400">
                  Upload new CV (PDF)
                </p>
                {editTarget?.resumeUrl ? (
                  <a
                    href={editTarget.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[12px] font-medium text-theme hover:underline whitespace-nowrap"
                  >
                    View current CV
                  </a>
                ) : (
                  <p className="text-[12px] text-slate-400">
                    No CV uploaded yet
                  </p>
                )}
              </div>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setEditResumeFile(e.target.files?.[0] ?? null)}
                className="h-10 rounded-lg border-slate-200 dark:border-neutral-800"
              />
              <p className="text-[12px] text-slate-400 mt-1">
                If uploaded, the existing CV will be replaced.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose
              disabled={updateMutation.isPending}
              className="h-9 px-5 rounded-lg border cursor-pointer border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-neutral-800"
            >
              Cancel
            </DialogClose>
            <Button
              onClick={confirmUpdate}
              disabled={updateMutation.isPending}
              className="h-9 px-5 cursor-pointer rounded-lg text-white text-[13px] font-semibold shadow-none border-none"
              style={{ backgroundColor: "var(--theme-color)" }}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
              Delete this candidate?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-neutral-200">
                {deleteTarget?.firstName} {deleteTarget?.lastName}
              </strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[13px] font-medium shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
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
