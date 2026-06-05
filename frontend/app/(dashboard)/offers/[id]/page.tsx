"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft01Icon,
  Mail01Icon,
  Linkedin01Icon,
  Call02Icon,
  EyeIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Mock Data ───────────────────────────────────────────────────────────────
type OfferStatus =
  | "Draft"
  | "Sent"
  | "Pending"
  | "Accepted"
  | "Declined"
  | "Withdrawn";

interface OfferDetail {
  id: number;
  candidateName: string;
  jobTitle: string;
  appliedDaysAgo: number;
  stage: string;
  phone: string;
  email: string;
  linkedin: string;
  status: OfferStatus;
  templateName: string;
  salary: string;
  currency: string;
  budgetMin: string;
  budgetMax: string;
  startDate: string;
  expiryDate: string;
}

const OFFER_DATA: Record<number, OfferDetail> = {
  1: {
    id: 1,
    candidateName: "Chamal Senarathna",
    jobTitle: "Tech Lead - APIM",
    appliedDaysAgo: 4,
    stage: "Interview",
    phone: "+94 71 710 160",
    email: "chamals@gmail.com",
    linkedin: "in/chamalsena",
    status: "Draft",
    templateName: "Software Engineering Offer Letter",
    salary: "",
    currency: "",
    budgetMin: "3000",
    budgetMax: "4000",
    startDate: "",
    expiryDate: "",
  },
  2: {
    id: 2,
    candidateName: "Nisal Periyapperuma",
    jobTitle: "Software Engineer",
    appliedDaysAgo: 7,
    stage: "Offer",
    phone: "+94 77 234 5678",
    email: "nisal.p@gmail.com",
    linkedin: "in/nisalp",
    status: "Sent",
    templateName: "Software Engineering Offer Letter",
    salary: "5000",
    currency: "USD",
    budgetMin: "4000",
    budgetMax: "6000",
    startDate: "2026-03-01",
    expiryDate: "2026-03-10",
  },
  3: {
    id: 3,
    candidateName: "Palihawadana Lastname",
    jobTitle: "UI UX Intern",
    appliedDaysAgo: 2,
    stage: "Applied",
    phone: "+94 76 111 2222",
    email: "pali@gmail.com",
    linkedin: "in/pali",
    status: "Pending",
    templateName: "General Update Email",
    salary: "1500",
    currency: "USD",
    budgetMin: "1000",
    budgetMax: "2000",
    startDate: "2026-04-01",
    expiryDate: "2026-04-15",
  },
  4: {
    id: 4,
    candidateName: "Risikeesan LastName",
    jobTitle: "ML Engineer",
    appliedDaysAgo: 10,
    stage: "Offer",
    phone: "+94 75 999 0000",
    email: "risi@gmail.com",
    linkedin: "in/risikesan",
    status: "Accepted",
    templateName: "Backend Engineer Offer Letter",
    salary: "7000",
    currency: "USD",
    budgetMin: "6000",
    budgetMax: "8000",
    startDate: "2026-03-15",
    expiryDate: "2026-03-22",
  },
  5: {
    id: 5,
    candidateName: "Prasad Lastname",
    jobTitle: "Software Engineer",
    appliedDaysAgo: 14,
    stage: "Rejected",
    phone: "+94 71 777 8888",
    email: "prasad@gmail.com",
    linkedin: "in/prasad",
    status: "Declined",
    templateName: "Software Engineering Offer Letter",
    salary: "4500",
    currency: "USD",
    budgetMin: "4000",
    budgetMax: "5500",
    startDate: "2026-02-15",
    expiryDate: "2026-02-22",
  },
  6: {
    id: 6,
    candidateName: "Jathusha LastName",
    jobTitle: "Business Analyst",
    appliedDaysAgo: 21,
    stage: "Withdrawn",
    phone: "+94 70 333 4444",
    email: "jathusha@gmail.com",
    linkedin: "in/jathusha",
    status: "Withdrawn",
    templateName: "General Update Email",
    salary: "4000",
    currency: "USD",
    budgetMin: "3500",
    budgetMax: "5000",
    startDate: "2026-02-01",
    expiryDate: "2026-02-10",
  },
};

const STATUS_STYLES: Record<OfferStatus, string> = {
  Draft: "bg-purple-50 text-purple-500 border border-purple-200",
  Sent: "bg-sky-50 text-sky-600 border border-sky-200",
  Pending: "bg-amber-50 text-amber-600 border border-amber-200",
  Accepted: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  Declined: "bg-red-50 text-red-500 border border-red-200",
  Withdrawn: "bg-slate-100 text-slate-500 border border-slate-200",
};

const STAGE_STYLES: Record<string, string> = {
  Interview: "bg-purple-50 text-purple-500 border border-purple-200",
  Offer: "bg-sky-50 text-sky-600 border border-sky-200",
  Applied: "bg-amber-50 text-amber-600 border border-amber-200",
  Accepted: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  Rejected: "bg-red-50 text-red-500 border border-red-200",
  Withdrawn: "bg-slate-100 text-slate-500 border border-slate-200",
};

type Tab = "Notes" | "Messages" | "Assessments Score" | "Offer";

export default function OfferDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const offer = OFFER_DATA[id];

  const [activeTab, setActiveTab] = useState<Tab>("Offer");
  const [salary, setSalary] = useState(offer?.salary ?? "");
  const [currency, setCurrency] = useState(offer?.currency ?? "");
  const [startDate, setStartDate] = useState(offer?.startDate ?? "");
  const [expiryDate, setExpiryDate] = useState(offer?.expiryDate ?? "");
  const [offerStatus, setOfferStatus] = useState<OfferStatus>(
    offer?.status ?? "Draft",
  );
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!offer) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <p className="text-slate-500 text-[15px]">Offer not found.</p>
          <Link
            href="offers"
            className="text-[var(--theme-color)] font-medium hover:underline text-sm"
          >
            ← Back to Manage Offers
          </Link>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    setOfferStatus("Sent");
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 3000);
  };

  const TABS: Tab[] = ["Notes", "Messages", "Assessments Score", "Offer"];

  return (
    <div className="flex flex-1 flex-col bg-white overflow-hidden">
      <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
        <Link
          href="offers"
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-[13px] font-medium transition-colors"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            className="size-4"
            strokeWidth={2}
          />
          Manage Offers
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[340px] shrink-0 border-r border-slate-200 flex flex-col overflow-y-auto bg-white">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3 mb-3">
              <div className="size-10 rounded-full bg-[var(--theme-color)]/10 flex items-center justify-center text-[14px] font-bold text-[var(--theme-color)] shrink-0">
                {offer.candidateName
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-semibold text-slate-900 leading-tight">
                    {offer.candidateName}
                  </h2>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_STYLES[offer.stage] ?? "bg-slate-100 text-slate-500"}`}
                  >
                    {offer.stage}
                  </span>
                </div>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  {offer.jobTitle} · Applied {offer.appliedDaysAgo} days ago
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2 text-[13px] text-slate-600">
                <HugeiconsIcon
                  icon={Call02Icon}
                  className="size-3.5 text-slate-400 shrink-0"
                />
                {offer.phone}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-slate-600">
                <HugeiconsIcon
                  icon={Mail01Icon}
                  className="size-3.5 text-slate-400 shrink-0"
                />
                {offer.email}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-slate-600">
                <HugeiconsIcon
                  icon={Linkedin01Icon}
                  className="size-3.5 text-slate-400 shrink-0"
                />
                {offer.linkedin}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-50 m-4 rounded-xl border border-slate-200 min-h-[320px]">
            <div className="size-10 rounded-xl bg-slate-200 flex items-center justify-center">
              <HugeiconsIcon icon={EyeIcon} className="size-5 text-slate-400" />
            </div>
            <span className="text-[13px] font-semibold text-slate-400 tracking-wide uppercase">
              CV Preview (PDF)
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
          <div className="px-6 pt-5 pb-0 bg-white border-b border-slate-200 flex items-end gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-[13px] font-medium rounded-t-lg border border-b-0 transition-colors ${
                  activeTab === tab
                    ? "bg-white border-slate-200 text-slate-900 -mb-px"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab !== "Offer" ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-[13px]">
                No content yet for {activeTab}.
              </div>
            ) : (
              <div className="max-w-[520px]">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-semibold text-slate-800">
                        {offer.templateName}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[offerStatus]}`}
                      >
                        {offerStatus}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      className="h-8 px-4 text-[13px] font-medium border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none rounded-lg gap-1.5"
                    >
                      <HugeiconsIcon icon={EyeIcon} className="size-3.5" />
                      Preview Offer
                    </Button>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[13px] text-slate-700 font-medium mb-1.5 block">
                          Salary
                        </Label>
                        <Input
                          type="number"
                          placeholder=""
                          value={salary}
                          onChange={(e) => setSalary(e.target.value)}
                          className="h-10 border-slate-200 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[13px] text-slate-700 font-medium mb-1.5 block">
                          Currency
                        </Label>
                        <Input
                          placeholder=""
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="h-10 border-slate-200 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm"
                        />
                      </div>
                    </div>

                    <p className="text-[12px] text-slate-500">
                      *Budget Range For This Role: USD {offer.budgetMin} –{" "}
                      {offer.budgetMax}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[13px] text-slate-700 font-medium mb-1.5 block">
                          Start Date
                        </Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-10 border-slate-200 rounded-lg shadow-none focus-visible:ring-0 focus-visible:border-[var(--theme-color)]/50 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[13px] text-slate-700 font-medium mb-1.5 block">
                          Expiry Date
                        </Label>
                        <Input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
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
                          offerStatus === "Declined"
                        }
                        className="w-full h-11 rounded-lg bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-semibold text-[14px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <HugeiconsIcon icon={SentIcon} className="size-4" />
                        {offerStatus === "Sent"
                          ? "Offer Already Sent"
                          : offerStatus === "Accepted"
                            ? "Offer Accepted"
                            : offerStatus === "Declined"
                              ? "Offer Declined"
                              : "Send Offer"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
