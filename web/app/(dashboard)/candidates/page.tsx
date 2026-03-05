"use client";
import { useState, useEffect, useRef } from "react";
import {
  Search01Icon,
  PlusSignIcon,
  CallIcon,
  Mail01Icon,
  Linkedin01Icon,
  SentIcon,
  ArrowUpRight01Icon,
  MoreVerticalIcon,
  Archive01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { loadCandidates } from "@/lib/candidate-store";
const INITIAL_CANDIDATES = [
  {
    id: "c1",
    name: "Chamal Senarathna",
    status: "Screening Disqualified",
    statusColor: "bg-[#FEE4E2] text-[#B42318]",
    role: "Software Engineer - APIM",
    tags: "-",
    appliedOn: "Applied a minute ago",
    email: "chamals@gmail.com",
    phone: "+94 71 7110 160",
    linkedin: "in/chamalsena",
  },
  {
    id: "c2",
    name: "Nisal Periyapperuma",
    status: "Interview",
    statusColor: "bg-[#F4EBFF] text-[#7F56D9]",
    role: "VP - Software Engineering",
    tags: "-",
    appliedOn: "5 hours ago",
    email: "nisal@example.com",
    phone: "+94 77 1234 567",
    linkedin: "in/nisalp",
  },
  {
    id: "c3",
    name: "Bhanuka Harischandra",
    status: "Offer",
    statusColor: "bg-[#E6F4EA] text-[#1E8E3E]",
    role: "DevOps Intern",
    tags: "-",
    appliedOn: "1 day ago",
    email: "bhanuka@example.com",
    phone: "+94 76 9876 543",
    linkedin: "in/bhanukah",
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

export default function ManageCandidatesPage() {
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [selectedCandidate, setSelectedCandidate] = useState<
    (typeof INITIAL_CANDIDATES)[0] | null
  >(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<
    (typeof INITIAL_CANDIDATES)[0] | null
  >(null);

  useEffect(() => {
    const loaded = loadCandidates();
    if (loaded.length > 0)
      setCandidates([...(loaded as any), ...INITIAL_CANDIDATES]);
  }, []);

  const handleRowClick = (c: (typeof INITIAL_CANDIDATES)[0]) => {
    setSelectedCandidate(c);
    setIsDetailOpen(true);
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    archiveItem({
      id: archiveTarget.id,
      type: "candidate",
      name: archiveTarget.name,
      detail: archiveTarget.role,
    });
    setCandidates((prev) => prev.filter((c) => c.id !== archiveTarget.id));
    setArchiveTarget(null);
  };

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 leading-none">
          Manage Candidates
        </h1>
        <Button
          className="text-white rounded-lg h-10 px-4 flex items-center gap-2 border-none shadow-none text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--theme-color)" }}
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            className="size-4"
            strokeWidth={2.5}
          />
          <span>Add Candidate</span>
        </Button>
      </div>

      <div className="border-y border-slate-200 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none"
          />
          <Input
            placeholder="Search Candidate"
            className="pl-11 h-10! bg-white border-slate-200 shadow-none rounded-lg text-sm placeholder:text-slate-300 transition-[border-color] duration-200 ease-in-out"
          />
        </div>
        <Select>
          <SelectTrigger className="w-52 h-10! bg-white border-slate-200 shadow-none rounded-lg text-slate-500 text-sm focus:ring-0 px-4">
            <SelectValue placeholder="Job Position" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200">
            <SelectItem value="se">Software Engineer</SelectItem>
            <SelectItem value="devops">DevOps</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-44 h-10! bg-white border-slate-200 shadow-none rounded-lg text-slate-500 text-sm focus:ring-0 px-4">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200">
            <SelectItem value="screening">Screening</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          className="text-slate-600 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 border-none ml-2"
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
                  Candidate Name
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Stage Status
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Applied for
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Tags
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Applied on
                </TableHead>
                <TableHead className="h-13 px-4 w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-slate-400 text-sm"
                  >
                    No candidates found.
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((candidate) => (
                  <TableRow
                    key={candidate.id}
                    className="border-b border-slate-200 last:border-0 font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => handleRowClick(candidate)}
                  >
                    <TableCell className="h-13 px-8 py-0 font-medium text-slate-700">
                      {candidate.name}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0">
                      <Badge
                        className={`${candidate.statusColor} hover:${candidate.statusColor} border-none shadow-none font-medium px-2.5 py-0.5 rounded-full text-[12px]`}
                      >
                        {candidate.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-500 font-normal">
                      {candidate.role}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-400 font-normal">
                      {candidate.tags}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-500 font-normal">
                      {candidate.appliedOn}
                    </TableCell>
                    <TableCell
                      className="h-13 px-4 py-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowMenu onArchive={() => setArchiveTarget(candidate)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-200 bg-white">
            <span className="text-sm font-medium text-slate-400">
              Showing 1-{candidates.length} of {candidates.length} results
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-10 px-6 rounded-lg bg-white border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:text-slate-900 shadow-none gap-2 transition-all active:scale-95"
              >
                Previous
              </Button>
              <Button
                className="h-10 px-8 rounded-lg text-white font-semibold text-sm shadow-none transition-all active:scale-[0.98] border-none"
                style={{ backgroundColor: "var(--theme-color)" }}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent
          showCloseButton={true}
          className="w-[95vw] sm:max-w-[1320px] p-0 flex flex-row gap-0 border-l border-slate-200 shadow-none overflow-hidden bg-white"
        >
          {selectedCandidate && (
            <>
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="px-6 lg:px-10 py-6 lg:py-10 border-b border-slate-100 shrink-0 bg-white">
                  <div className="flex items-start sm:items-center gap-6 min-w-0">
                    <Avatar className="size-14 lg:size-16 rounded-full shrink-0">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedCandidate.name}`}
                      />
                      <AvatarFallback>
                        {selectedCandidate.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl lg:text-2xl font-semibold text-slate-900 tracking-tight truncate">
                          {selectedCandidate.name}
                        </h2>
                        <Badge
                          className={`${selectedCandidate.statusColor} hover:${selectedCandidate.statusColor} border-none shadow-none font-medium px-2 py-0.5 rounded-full text-[10px] lg:text-[11px] uppercase tracking-wider whitespace-nowrap`}
                        >
                          {selectedCandidate.status}
                        </Badge>
                      </div>
                      <p className="text-slate-500 font-medium text-xs lg:text-[14px]">
                        {selectedCandidate.role}{" "}
                        <span className="mx-1 opacity-30">•</span> Applied 4
                        days ago
                      </p>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 lg:pt-3">
                        {[
                          [CallIcon, selectedCandidate.phone],
                          [Mail01Icon, selectedCandidate.email],
                          [Linkedin01Icon, selectedCandidate.linkedin],
                        ].map(([icon, value], i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-slate-500 text-[12px] lg:text-[13px] font-medium hover:text-[var(--theme-color)] cursor-pointer whitespace-nowrap"
                          >
                            <HugeiconsIcon
                              icon={icon as any}
                              className="size-3.5 lg:size-4 text-slate-400"
                            />
                            <span>{value as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-slate-50 p-8 overflow-y-auto flex flex-col items-center">
                  <div className="bg-slate-200/40 rounded-xl w-full max-w-4xl h-[1200px] border border-slate-200 flex flex-col items-center justify-center text-slate-400 font-semibold shadow-inner relative overflow-hidden">
                    <div className="text-4xl opacity-10 font-bold uppercase tracking-[0.2em] transform -rotate-12 select-none">
                      CV PREVIEW (PDF)
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-[500px] border-l border-slate-100 flex flex-col bg-white overflow-hidden">
                <div className="h-20 shrink-0 flex items-center justify-start px-6">
                  <Button className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[12px] gap-2 px-5 h-10 rounded-[10px] shadow-none border-none">
                    <span>View CV in New Tab</span>
                    <HugeiconsIcon
                      icon={ArrowUpRight01Icon}
                      className="size-4"
                      strokeWidth={2.5}
                    />
                  </Button>
                </div>
                <Tabs
                  defaultValue="notes"
                  className="flex-1 flex flex-col overflow-hidden m-0"
                >
                  <div className="py-3 border-y border-slate-100 px-6 bg-white">
                    <TabsList className="bg-transparent h-fit w-full justify-start gap-2 p-0">
                      {["notes", "messages", "scores"].map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="data-[state=active]:bg-white data-[state=active]:border-[var(--theme-color)] data-[state=active]:text-[var(--theme-color)] border border-slate-200 rounded-[10px] px-5 py-2 text-[14px] font-medium text-slate-600 shadow-none h-[40px] bg-white cursor-pointer"
                        >
                          {tab === "notes"
                            ? "Internal Notes"
                            : tab === "scores"
                              ? "Assessments Score"
                              : "Messages"}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  <TabsContent
                    value="notes"
                    className="flex-1 flex flex-col p-0 m-0 overflow-hidden outline-none"
                  >
                    <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-50">
                      <div className="py-6 first:pt-0 flex gap-4">
                        <Avatar className="size-10 rounded-full shrink-0">
                          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Narendra" />
                          <AvatarFallback>NM</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[15px] font-bold text-slate-900">
                              Narendra Modi
                            </span>
                            <span className="text-[12px] text-slate-400">
                              5 minutes ago
                            </span>
                          </div>
                          <p className="text-[14px] text-slate-600 leading-relaxed">
                            Big Data, Machine Learning Artificial Intelligence
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 shrink-0 bg-white">
                      <div className="relative">
                        <Input
                          placeholder="Write your note here..."
                          className="h-12 pr-14 bg-white border-slate-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-[var(--theme-color)] shadow-none placeholder:text-slate-400"
                        />
                        <Button
                          size="icon"
                          className="absolute right-1 top-1 size-10 rounded-lg bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] shadow-none border-none"
                        >
                          <HugeiconsIcon
                            icon={SentIcon}
                            className="size-5 text-white rotate-[-45deg]"
                            strokeWidth={2.5}
                          />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="messages"
                    className="flex-1 p-8 text-center outline-none"
                  >
                    <p className="text-slate-400 text-sm italic">
                      No communications logs found.
                    </p>
                  </TabsContent>
                  <TabsContent
                    value="scores"
                    className="flex-1 p-8 text-center outline-none"
                  >
                    <p className="text-slate-400 text-sm italic">
                      No assessment scores available.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-900">
              Archive this candidate?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 leading-relaxed">
              <strong className="text-slate-700">{archiveTarget?.name}</strong>{" "}
              will be moved to the Archive. You can permanently delete them from
              Settings → Archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 text-slate-600 text-[13px] font-medium shadow-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              className="h-9 px-5 rounded-lg bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white text-[13px] font-medium shadow-none border-none"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
