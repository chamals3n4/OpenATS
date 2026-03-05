"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CallIcon,
  Mail01Icon,
  Linkedin01Icon,
  SentIcon,
  ArrowUpRight01Icon,
  EyeIcon,
  MoreVerticalIcon,
  Archive01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { archiveItem } from "@/lib/archive-store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
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

type OfferStatus =
  | "Draft"
  | "Sent"
  | "Pending"
  | "Accepted"
  | "Declined"
  | "Withdrawn";

interface Offer {
  id: number;
  candidateName: string;
  jobTitle: string;
  status: OfferStatus;
  salary: string;
  currency: string;
  createdAt: string;
  expiredDate: string;
  department: string;
  stage: string;
  phone: string;
  email: string;
  linkedin: string;
  templateName: string;
  budgetMin: string;
  budgetMax: string;
  startDate: string;
  expiryDate: string;
}

const OFFER_STATUS_STYLES: Record<OfferStatus, string> = {
  Draft: "bg-[#F4EBFF] text-[#7F56D9]",
  Sent: "bg-[#E0F2FE] text-[#0369A1]",
  Pending: "bg-[#FEF3C7] text-[#B45309]",
  Accepted: "bg-[#E6F4EA] text-[#1E8E3E]",
  Declined: "bg-[#FEE4E2] text-[#B42318]",
  Withdrawn: "bg-[#F1F5F9] text-[#64748B]",
};

const STAGE_STYLES: Record<string, string> = {
  Interview: "bg-[#F4EBFF] text-[#7F56D9]",
  Offer: "bg-[#E0F2FE] text-[#0369A1]",
  Applied: "bg-[#FEF3C7] text-[#B45309]",
  Accepted: "bg-[#E6F4EA] text-[#1E8E3E]",
  Rejected: "bg-[#FEE4E2] text-[#B42318]",
  Withdrawn: "bg-[#F1F5F9] text-[#64748B]",
};

const MOCK_OFFERS: Offer[] = [
  {
    id: 1,
    candidateName: "Chamal Senarathna",
    jobTitle: "Tech Lead",
    department: "Engineering",
    status: "Draft",
    salary: "",
    currency: "",
    createdAt: "14/02/2026",
    expiredDate: "14/02/2026",
    stage: "Interview",
    phone: "+94 71 7110 160",
    email: "chamals@gmail.com",
    linkedin: "in/chamalsena",
    templateName: "Software Engineering Offer Letter",
    budgetMin: "3000",
    budgetMax: "4000",
    startDate: "",
    expiryDate: "",
  },
  {
    id: 2,
    candidateName: "Nisal Periyapperuma",
    jobTitle: "Software Engineer",
    department: "Engineering",
    status: "Sent",
    salary: "5000",
    currency: "USD",
    createdAt: "14/02/2026",
    expiredDate: "14/02/2026",
    stage: "Offer",
    phone: "+94 77 234 5678",
    email: "nisal.p@gmail.com",
    linkedin: "in/nisalp",
    templateName: "Software Engineering Offer Letter",
    budgetMin: "4000",
    budgetMax: "6000",
    startDate: "2026-03-01",
    expiryDate: "2026-03-10",
  },
  {
    id: 3,
    candidateName: "Palihawadana Lastname",
    jobTitle: "UI UX Intern",
    department: "Design",
    status: "Pending",
    salary: "1500",
    currency: "USD",
    createdAt: "14/02/2026",
    expiredDate: "14/02/2026",
    stage: "Applied",
    phone: "+94 76 111 2222",
    email: "pali@gmail.com",
    linkedin: "in/pali",
    templateName: "General Update Email",
    budgetMin: "1000",
    budgetMax: "2000",
    startDate: "2026-04-01",
    expiryDate: "2026-04-15",
  },
  {
    id: 4,
    candidateName: "Risikeesan LastName",
    jobTitle: "ML Engineer",
    department: "Engineering",
    status: "Accepted",
    salary: "7000",
    currency: "USD",
    createdAt: "14/02/2026",
    expiredDate: "14/02/2026",
    stage: "Offer",
    phone: "+94 75 999 0000",
    email: "risi@gmail.com",
    linkedin: "in/risikesan",
    templateName: "Backend Engineer Offer Letter",
    budgetMin: "6000",
    budgetMax: "8000",
    startDate: "2026-03-15",
    expiryDate: "2026-03-22",
  },
  {
    id: 5,
    candidateName: "Prasad Lastname",
    jobTitle: "Software Engineer",
    department: "Engineering",
    status: "Declined",
    salary: "4500",
    currency: "USD",
    createdAt: "14/02/2026",
    expiredDate: "14/02/2026",
    stage: "Rejected",
    phone: "+94 71 777 8888",
    email: "prasad@gmail.com",
    linkedin: "in/prasad",
    templateName: "Software Engineering Offer Letter",
    budgetMin: "4000",
    budgetMax: "5500",
    startDate: "2026-02-15",
    expiryDate: "2026-02-22",
  },
  {
    id: 6,
    candidateName: "Jathusha LastName",
    jobTitle: "Business Analyst",
    department: "Operations",
    status: "Withdrawn",
    salary: "4000",
    currency: "USD",
    createdAt: "14/02/2026",
    expiredDate: "14/02/2026",
    stage: "Withdrawn",
    phone: "+94 70 333 4444",
    email: "jathusha@gmail.com",
    linkedin: "in/jathusha",
    templateName: "General Update Email",
    budgetMin: "3500",
    budgetMax: "5000",
    startDate: "2026-02-01",
    expiryDate: "2026-02-10",
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

export default function ManageOffersPage() {
  const [offers, setOffers] = useState<Offer[]>(MOCK_OFFERS);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [archiveTarget, setArchiveTarget] = useState<Offer | null>(null);

  const [selected, setSelected] = useState<Offer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [offerSalary, setOfferSalary] = useState("");
  const [offerCurrency, setOfferCurrency] = useState("");
  const [offerStartDate, setOfferStartDate] = useState("");
  const [offerExpiryDate, setOfferExpiryDate] = useState("");
  const [offerStatus, setOfferStatus] = useState<OfferStatus>("Draft");
  const [sendSuccess, setSendSuccess] = useState(false);

  const openOffer = (o: Offer) => {
    setSelected(o);
    setOfferSalary(o.salary);
    setOfferCurrency(o.currency);
    setOfferStartDate(o.startDate);
    setOfferExpiryDate(o.expiryDate);
    setOfferStatus(o.status);
    setSendSuccess(false);
    setSheetOpen(true);
  };

  const handleSend = () => {
    setOfferStatus("Sent");
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 3000);
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    archiveItem({
      id: String(archiveTarget.id),
      type: "offer",
      name: archiveTarget.candidateName,
      detail: archiveTarget.jobTitle,
    });
    setOffers((prev) => prev.filter((o) => o.id !== archiveTarget.id));
    setArchiveTarget(null);
  };

  const filtered = offers.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.candidateName.toLowerCase().includes(q) ||
        o.jobTitle.toLowerCase().includes(q)) &&
      (filterDept === "all" || o.department === filterDept) &&
      (filterStatus === "all" || o.status.toLowerCase() === filterStatus)
    );
  });

  const hasFilters = search || filterDept !== "all" || filterStatus !== "all";

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 leading-none">
          Manage Offers
        </h1>
      </div>

      <div className="border-y border-slate-200 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none"
          />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-10! bg-white border-slate-200 shadow-none rounded-lg text-sm placeholder:text-slate-300 transition-[border-color] duration-200 ease-in-out"
          />
        </div>
        <Select
          value={filterDept}
          onValueChange={(v) => setFilterDept(v ?? "all")}
        >
          <SelectTrigger className="w-48 h-10! bg-white border-slate-200 shadow-none rounded-lg text-slate-500 text-sm focus:ring-0 px-4">
            <SelectValue placeholder="Departments" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200">
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Engineering">Engineering</SelectItem>
            <SelectItem value="Design">Design</SelectItem>
            <SelectItem value="Operations">Operations</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v ?? "all")}
        >
          <SelectTrigger className="w-40 h-10! bg-white border-slate-200 shadow-none rounded-lg text-slate-500 text-sm focus:ring-0 px-4">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setFilterDept("all");
              setFilterStatus("all");
            }}
            className="text-slate-600 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 border-none"
          >
            Clear All
          </Button>
        )}
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
                  Job Title
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Offer Status
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Salary Offered
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Created At
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 text-sm">
                  Expired Date
                </TableHead>
                <TableHead className="h-13 px-4 w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-slate-400 text-sm"
                  >
                    No offers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow
                    key={o.id}
                    className="border-b border-slate-200 last:border-0 font-medium hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => openOffer(o)}
                  >
                    <TableCell className="h-14 px-8 py-0 text-slate-700 font-medium">
                      {o.candidateName}
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-slate-600 font-normal">
                      {o.jobTitle}
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0">
                      <Badge
                        className={`${OFFER_STATUS_STYLES[o.status]} hover:${OFFER_STATUS_STYLES[o.status]} border-none shadow-none font-medium px-2.5 py-0.5 rounded-full text-[12px]`}
                      >
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-slate-600 font-normal">
                      {o.salary ? `${o.currency} ${o.salary}` : "—"}
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-slate-600 font-normal">
                      {o.createdAt}
                    </TableCell>
                    <TableCell className="h-14 px-8 py-0 text-slate-600 font-normal">
                      {o.expiredDate}
                    </TableCell>
                    <TableCell
                      className="h-14 px-4 py-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowMenu onArchive={() => setArchiveTarget(o)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-200 bg-white">
            <span className="text-sm font-medium text-slate-400">
              Showing 1–{filtered.length} of {filtered.length} results
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-10 px-6 rounded-lg bg-white border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 shadow-none gap-2"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />{" "}
                Previous
              </Button>
              <Button
                className="h-10 px-8 rounded-lg text-white font-semibold text-sm shadow-none border-none gap-2"
                style={{ backgroundColor: "var(--theme-color)" }}
              >
                Next{" "}
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          showCloseButton={true}
          className="w-[95vw] sm:max-w-[1320px] p-0 flex flex-row gap-0 border-l border-slate-200 shadow-none overflow-hidden bg-white"
        >
          {selected && (
            <>
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="px-6 lg:px-10 py-6 lg:py-10 border-b border-slate-100 shrink-0 bg-white">
                  <div className="flex items-start sm:items-center gap-6 min-w-0">
                    <Avatar className="size-14 lg:size-16 rounded-full shrink-0">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selected.candidateName}`}
                      />
                      <AvatarFallback>
                        {selected.candidateName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl lg:text-2xl font-semibold text-slate-900 tracking-tight truncate">
                          {selected.candidateName}
                        </h2>
                        <Badge
                          className={`${STAGE_STYLES[selected.stage] ?? "bg-slate-100 text-slate-500"} hover:opacity-100 border-none shadow-none font-medium px-2 py-0.5 rounded-full text-[10px] lg:text-[11px] uppercase tracking-wider whitespace-nowrap`}
                        >
                          {selected.stage}
                        </Badge>
                      </div>
                      <p className="text-slate-500 font-medium text-xs lg:text-[14px]">
                        {selected.jobTitle}{" "}
                        <span className="mx-1 opacity-30">•</span> Applied 4
                        days ago
                      </p>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 lg:pt-3">
                        {[
                          [CallIcon, selected.phone],
                          [Mail01Icon, selected.email],
                          [Linkedin01Icon, selected.linkedin],
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
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-200/10 to-transparent pointer-events-none" />
                    <div className="text-4xl opacity-10 font-bold uppercase tracking-[0.2em] transform -rotate-12 select-none">
                      CV PREVIEW (PDF)
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-[500px] border-l border-slate-100 flex flex-col bg-white overflow-hidden">
                <div className="h-20 shrink-0 flex items-center justify-start px-6">
                  <Button
                    className="text-white font-medium text-[12px] gap-2 px-5 h-10 rounded-[10px] shadow-none border-none"
                    style={{ backgroundColor: "var(--theme-color)" }}
                  >
                    <span>View CV in New Tab</span>
                    <HugeiconsIcon
                      icon={ArrowUpRight01Icon}
                      className="size-4"
                      strokeWidth={2.5}
                    />
                  </Button>
                </div>

                <Tabs
                  defaultValue="offer"
                  className="flex-1 flex flex-col overflow-hidden m-0"
                >
                  <div className="py-3 border-y border-slate-100 px-6 bg-white">
                    <TabsList className="bg-transparent h-fit w-full justify-start gap-2 p-0">
                      {["notes", "messages", "scores", "offer"].map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="data-[state=active]:bg-white data-[state=active]:border-[var(--theme-color)] data-[state=active]:text-[var(--theme-color)] border border-slate-200 rounded-[10px] px-4 py-2 text-[13px] font-medium text-slate-600 shadow-none h-[38px] bg-white cursor-pointer capitalize"
                        >
                          {tab === "scores"
                            ? "Assessments"
                            : tab === "notes"
                              ? "Internal Notes"
                              : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <TabsContent
                    value="notes"
                    className="flex-1 flex flex-col p-0 m-0 overflow-hidden outline-none"
                  >
                    <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-50">
                      {[
                        {
                          seed: "Narendra",
                          name: "Narendra Modi",
                          time: "5 minutes ago",
                          note: "Big Data, Machine Learning Artificial Intelligence",
                        },
                        {
                          seed: "Anura",
                          name: "Anura Kumara Dissanayake",
                          time: "a few minutes ago",
                          note: '"this guy dont know how to center div"',
                        },
                      ].map((n, i) => (
                        <div key={i} className="py-6 first:pt-0 flex gap-4">
                          <Avatar className="size-10 rounded-full shrink-0">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${n.seed}`}
                            />
                            <AvatarFallback>
                              {n.name
                                .split(" ")
                                .map((x) => x[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[15px] font-bold text-slate-900">
                                {n.name}
                              </span>
                              <span className="text-[12px] text-slate-400">
                                {n.time}
                              </span>
                            </div>
                            <p className="text-[14px] text-slate-600 leading-relaxed italic">
                              {n.note}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 border-t border-slate-100 shrink-0">
                      <div className="relative">
                        <Input
                          placeholder="Write your note here..."
                          className="h-12 pr-14 bg-white border-slate-200 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-[var(--theme-color)] shadow-none placeholder:text-slate-400"
                        />
                        <Button
                          size="icon"
                          className="absolute right-1 top-1 size-10 rounded-lg shadow-none border-none"
                          style={{ backgroundColor: "var(--theme-color)" }}
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

                  <TabsContent
                    value="offer"
                    className="flex-1 overflow-y-auto p-6 outline-none m-0"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[14px] font-semibold text-slate-800 truncate">
                            {selected.templateName}
                          </span>
                          <Badge
                            className={`${OFFER_STATUS_STYLES[offerStatus]} hover:opacity-100 border-none shadow-none font-medium px-2.5 py-0.5 rounded-full text-[11px] shrink-0`}
                          >
                            {offerStatus}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-[12px] font-medium border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none rounded-lg gap-1.5 shrink-0"
                        >
                          <HugeiconsIcon icon={EyeIcon} className="size-3.5" />
                          Preview
                        </Button>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[12px] text-slate-700 font-medium mb-1.5 block">
                              Salary
                            </Label>
                            <Input
                              type="number"
                              value={offerSalary}
                              onChange={(e) => setOfferSalary(e.target.value)}
                              className="h-10 border-slate-200 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-[12px] text-slate-700 font-medium mb-1.5 block">
                              Currency
                            </Label>
                            <Input
                              value={offerCurrency}
                              onChange={(e) => setOfferCurrency(e.target.value)}
                              className="h-10 border-slate-200 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm"
                            />
                          </div>
                        </div>

                        <p className="text-[12px] text-slate-400">
                          *Budget Range For This Role: USD {selected.budgetMin}{" "}
                          – {selected.budgetMax}
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[12px] text-slate-700 font-medium mb-1.5 block">
                              Start Date
                            </Label>
                            <Input
                              type="date"
                              value={offerStartDate}
                              onChange={(e) =>
                                setOfferStartDate(e.target.value)
                              }
                              className="h-10 border-slate-200 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-[12px] text-slate-700 font-medium mb-1.5 block">
                              Expiry Date
                            </Label>
                            <Input
                              type="date"
                              value={offerExpiryDate}
                              onChange={(e) =>
                                setOfferExpiryDate(e.target.value)
                              }
                              className="h-10 border-slate-200 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm"
                            />
                          </div>
                        </div>

                        {sendSuccess ? (
                          <div className="w-full h-11 rounded-lg bg-emerald-500 flex items-center justify-center gap-2 text-white font-semibold text-[14px]">
                            <HugeiconsIcon icon={SentIcon} className="size-4" />
                            Offer Sent Successfully!
                          </div>
                        ) : (
                          <button
                            onClick={handleSend}
                            disabled={
                              offerStatus === "Sent" ||
                              offerStatus === "Accepted" ||
                              offerStatus === "Declined" ||
                              offerStatus === "Withdrawn"
                            }
                            className="w-full h-11 rounded-lg text-white font-semibold text-[14px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: "var(--theme-color)" }}
                          >
                            <HugeiconsIcon icon={SentIcon} className="size-4" />
                            {offerStatus === "Sent"
                              ? "Offer Already Sent"
                              : offerStatus === "Accepted"
                                ? "Offer Accepted"
                                : offerStatus === "Declined"
                                  ? "Offer Declined"
                                  : offerStatus === "Withdrawn"
                                    ? "Offer Withdrawn"
                                    : "Send Offer"}
                          </button>
                        )}
                      </div>
                    </div>
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
              Archive this offer?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 leading-relaxed">
              The offer for{" "}
              <strong className="text-slate-700">
                {archiveTarget?.candidateName}
              </strong>{" "}
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
