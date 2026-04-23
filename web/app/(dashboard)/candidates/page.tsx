"use client";
import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search01Icon,
  CallIcon,
  Mail01Icon,
  PencilEdit01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  useJobs,
  useUpdateCandidateBasicDetails,
} from "@/hooks/use-api";
import { serverFetch } from "@/lib/auth-action";
import { ResumeScrollView } from "@/components/resume-scroll-view";
import { CandidateSidePanel } from "@/components/candidate-side-panel";
import type { Candidate, CandidateDetail } from "@/types";

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
  const queryClient = useQueryClient();
  const PAGE_SIZE = 8;
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [editTarget, setEditTarget] = useState<Candidate | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editResumeFile, setEditResumeFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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
  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCandidates = useMemo(() => {
    const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
    return candidates.slice(pageStart, pageStart + PAGE_SIZE);
  }, [candidates, safeCurrentPage]);
  const showingFrom =
    candidates.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const showingTo =
    showingFrom === 0 ? 0 : showingFrom + paginatedCandidates.length - 1;

  const selectedCandidate = candidates.find((c) => c.id === selectedId) ?? null;

  const prefetchCandidateDetail = (candidateId: number) => {
    void queryClient.prefetchQuery({
      queryKey: ["candidates", candidateId],
      queryFn: () =>
        serverFetch<{ data: CandidateDetail }>(`/candidates/${candidateId}`),
      staleTime: 30_000,
    });
  };

  const handleRowClick = (c: Candidate) => {
    prefetchCandidateDetail(c.id);
    setSelectedId(c.id);
    setIsDetailOpen(true);
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
        if (selectedId === deleteTarget.id) setIsDetailOpen(false);
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
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-11 h-10! bg-slate-50 dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-sm placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-[border-color] duration-200 ease-in-out"
          />
        </div>

        <Select
          value={selectedJobId ? String(selectedJobId) : "all"}
          onValueChange={(v) => {
            setSelectedJobId(v === "all" ? undefined : Number(v));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-72 h-10! bg-slate-50 cursor-pointer dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue placeholder="Job Position">
              {selectedJobId
                ? (jobs.find((j) => j.id === selectedJobId)?.title ?? null)
                : "All Positions"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            align="start"
            alignOffset={0}
            className="-ml-1 w-53 rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900"
          >
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
            setCurrentPage(1);
          }}
          className="text-slate-600 cursor-pointer dark:text-neutral-400 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none ml-2"
        >
          Clear All
        </Button>
      </div>

      {/* Table */}
      <div className="px-8 py-6">
        <div className="border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-900 hover:bg-transparent">
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
                paginatedCandidates.map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
                    onMouseEnter={() => prefetchCandidateDetail(c.id)}
                    onFocus={() => prefetchCandidateDetail(c.id)}
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
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-md cursor-pointer border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300"
                          onClick={() => openEditDialog(c)}
                        >
                          <HugeiconsIcon
                            icon={PencilEdit01Icon}
                            className="size-3.5 mr-1"
                          />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-md cursor-pointer border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400"
                          onClick={() => setDeleteTarget(c)}
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

          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <span className="text-sm font-medium text-slate-400 dark:text-neutral-500">
              {isLoading
                ? "Loading..."
                : `Showing ${showingFrom}-${showingTo} of ${candidates.length} results`}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage <= 1 || isLoading}
                className="h-10 px-6 cursor-pointer rounded-lg bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-neutral-100 shadow-none gap-2"
              >
                Previous
              </Button>
              <Button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))
                }
                disabled={safeCurrentPage >= totalPages || isLoading}
                className="h-10 px-8 cursor-pointer rounded-lg text-white font-semibold text-sm shadow-none transition-all active:scale-[0.98] border-none"
                style={{ backgroundColor: "var(--theme-color)" }}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent
          showCloseButton={true}
          className="w-[98vw] sm:max-w-[98vw] p-0 flex flex-row gap-0 border-l border-slate-200 dark:border-neutral-800 shadow-none overflow-hidden bg-white dark:bg-neutral-950"
        >
          {selectedCandidate && (
            <>
              {/* Left — CV preview */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="px-6 lg:px-8 py-4 lg:py-5 border-b border-slate-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-950">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100 tracking-tight">
                      {selectedCandidate.firstName} {selectedCandidate.lastName}
                    </h2>
                    {selectedCandidate.stageName && (
                      <Badge className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border-none shadow-none font-medium px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider whitespace-nowrap">
                        {selectedCandidate.stageName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-neutral-400 text-[13px] mt-0.5">
                    {selectedCandidate.jobTitle ?? "Unknown Job"}
                    <span className="mx-1.5 opacity-30 mt-1">•</span>
                    Applied {timeAgo(selectedCandidate.appliedAt)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1.5">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 text-[12px] font-medium hover:text-theme cursor-pointer whitespace-nowrap">
                      <HugeiconsIcon
                        icon={CallIcon}
                        className="size-3.5 text-slate-400"
                      />
                      <span>{selectedCandidate.phone ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 text-[12px] font-medium hover:text-theme cursor-pointer whitespace-nowrap">
                      <HugeiconsIcon
                        icon={Mail01Icon}
                        className="size-3.5 text-slate-400"
                      />
                      <span>{selectedCandidate.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {selectedCandidate.resumeUrl ? (
                    <ResumeScrollView resumeUrl={selectedCandidate.resumeUrl} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                      <svg
                        className="size-10 opacity-30"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-[13px] font-medium">
                        No resume uploaded
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right — answers + history */}
              <CandidateSidePanel
                candidateId={selectedCandidate.id}
                open={isDetailOpen}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

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
        <AlertDialogContent className="max-w-lg rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
              Delete this candidate?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-500 dark:text-neutral-400">
              <strong className="text-slate-700 dark:text-neutral-200">
                {deleteTarget?.firstName} {deleteTarget?.lastName}
              </strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-10 px-6 rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[14px] font-medium shadow-none cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="h-10 px-6 rounded-md bg-red-500 hover:bg-red-600 text-white text-[14px] font-medium shadow-none border-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {deleteMutation.isPending ? (
                <>
                  <Spinner className="size-3.5" />
                  Deleting
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
