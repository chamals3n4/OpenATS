"use client";

import { useMemo, useState } from "react";
import {
  Download05Icon,
  ListViewIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  useAnalyticsReport,
  useExportAnalyticsReport,
} from "@/hooks/queries/use-reports";
import { useDepartments } from "@/hooks/queries/use-company";

import { Button } from "@/components/ui/button";
import {
  PipelineChart,
  VolumeChart,
  DeptChart,
  OfferChart,
} from "./_overview-charts";

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 overflow-hidden">
      <div className="px-4 pt-4 pb-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
          {title}
        </p>
        <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
          {subtitle}
        </p>
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}

const PERIOD_LABELS: Record<string, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
};

export function OverviewClient() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [dept, setDept] = useState("all");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  const selectedDepartmentId = dept === "all" ? undefined : Number(dept);

  const { data: deptRes } = useDepartments();
  const departments = deptRes?.data ?? [];

  const { data: analyticsRes } = useAnalyticsReport(
    period,
    selectedDepartmentId,
  );
  const exportReport = useExportAnalyticsReport();
  const report = analyticsRes?.data;

  const pipelineData = report?.pipelineReport ?? [];
  const volumeData = report?.candidateVolume ?? [];
  const deptData = report?.timeToHireByDepartment ?? [];
  const offerData = report?.offerTrends ?? [];

  const DEPT_LABELS: Record<string, string> = useMemo(() => {
    const labels: Record<string, string> = { all: "All Departments" };
    departments.forEach((d) => {
      labels[String(d.id)] = d.name;
    });
    return labels;
  }, [departments]);

  const STATS = useMemo(
    () => [
      {
        label: "Total Candidates",
        value: String(report?.summary.totalCandidates ?? 0),
        delta: `${(report?.summary.totalCandidatesDeltaPct ?? 0) >= 0 ? "+" : ""}${(report?.summary.totalCandidatesDeltaPct ?? 0).toFixed(1)}%`,
        up: (report?.summary.totalCandidatesDeltaPct ?? 0) >= 0,
      },
      {
        label: "Open Positions",
        value: String(report?.summary.openPositions ?? 0),
        delta: `${(report?.summary.openPositionsDelta ?? 0) >= 0 ? "+" : ""}${report?.summary.openPositionsDelta ?? 0}`,
        up: (report?.summary.openPositionsDelta ?? 0) >= 0,
      },
      {
        label: "Avg. Time To Hire",
        value: String(report?.summary.avgTimeToHireDays ?? 0),
        delta: `${(report?.summary.avgTimeToHireDeltaDays ?? 0) >= 0 ? "-" : "+"}${Math.abs(report?.summary.avgTimeToHireDeltaDays ?? 0).toFixed(1)} days`,
        up: (report?.summary.avgTimeToHireDeltaDays ?? 0) >= 0,
      },
      {
        label: "Offer Acceptance Rate",
        value: `${(report?.summary.offerAcceptanceRate ?? 0).toFixed(1)}%`,
        delta: `${(report?.summary.offerAcceptanceRateDeltaPct ?? 0) >= 0 ? "+" : ""}${(report?.summary.offerAcceptanceRateDeltaPct ?? 0).toFixed(1)}%`,
        up: (report?.summary.offerAcceptanceRateDeltaPct ?? 0) >= 0,
      },
    ],
    [report],
  );

  const handleExport = async () => {
    const result = await exportReport.mutateAsync({
      period,
      departmentId: selectedDepartmentId,
      format: exportFormat,
    });

    const payload = result.data;
    const blob = new Blob([payload.content], { type: payload.mimeType });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: payload.fileName,
    });
    a.click();
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Reports And Analytics
        </h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setExportDialogOpen(true)}
            className="bg-theme hover:bg-theme-hover text-white rounded-md h-8 px-3 flex items-center gap-1.5 border border-theme shadow-none text-sm font-semibold cursor-pointer"
          >
            <HugeiconsIcon icon={Download05Icon} className="size-3.5" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-y border-slate-200 dark:border-neutral-800 px-6 py-2.5 flex items-center gap-2">
        <Select
          value={period}
          onValueChange={(value) => setPeriod(value ?? "7d")}
        >
          <SelectTrigger className="w-44 h-8! cursor-pointer bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue>{PERIOD_LABELS[period]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-md shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dept} onValueChange={(value) => setDept(value ?? "all")}>
          <SelectTrigger className="w-44 h-8! cursor-pointer bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue>{DEPT_LABELS[dept]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-md shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="px-6 py-4 flex flex-col gap-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 p-4 flex flex-col gap-2"
            >
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
                {s.label}
              </p>
              <div className="flex items-end justify-between gap-2">
                <p className="text-2xl font-medium text-slate-800 dark:text-neutral-100 leading-none">
                  {s.value}
                </p>
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full mb-0.5 ${s.up ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30" : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"}`}
                >
                  {s.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard
            title="Pipeline Report"
            subtitle="Candidates By Stage (Current Vs. Previous Period)"
          >
            <PipelineChart data={pipelineData} />
          </ChartCard>

          <ChartCard
            title="Candidate Volume"
            subtitle="Applications And Hires Over Time"
          >
            <VolumeChart data={volumeData} />
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Time To Hire" subtitle="Average days by department">
            <DeptChart data={deptData} />
          </ChartCard>

          <ChartCard
            title="Offer Trends"
            subtitle="Offers sent vs. accepted (last 5 months)"
          >
            <OfferChart data={offerData} />
          </ChartCard>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-neutral-100 text-base font-semibold">
              Export Report
            </DialogTitle>
            <p className="text-xs text-slate-400 dark:text-neutral-500">
              Choose a format to download the analytics report.
            </p>
          </DialogHeader>

          <div className="flex gap-3">
            {(["csv", "json"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`flex flex-1 items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors cursor-pointer
                  ${
                    exportFormat === fmt
                      ? "border-theme bg-theme/5 dark:bg-theme/10"
                      : "border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600"
                  }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors
                    ${exportFormat === fmt ? "border-theme" : "border-slate-300 dark:border-neutral-600"}`}
                >
                  {exportFormat === fmt && (
                    <span className="h-2 w-2 rounded-full bg-theme" />
                  )}
                </span>
                <HugeiconsIcon
                  icon={fmt === "json" ? TextIcon : ListViewIcon}
                  className={`size-4 shrink-0 ${exportFormat === fmt ? "text-theme" : "text-slate-400 dark:text-neutral-500"}`}
                />
                <div>
                  <p
                    className={`text-sm font-semibold leading-none mb-1 ${exportFormat === fmt ? "text-slate-800 dark:text-neutral-100" : "text-slate-600 dark:text-neutral-300"}`}
                  >
                    {fmt.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-neutral-500">
                    {fmt === "csv" ? "Rows & columns" : "Developer-friendly"}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose
              render={
                <Button
                  variant="outline"
                  className="flex-1 h-9 rounded-lg border-slate-200 dark:border-neutral-700 text-white dark:text-neutral-300 text-sm shadow-none cursor-pointer"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleExport}
              disabled={exportReport.isPending}
              className="flex-1 h-9 bg-theme hover:bg-theme-hover text-white rounded-lg border border-theme shadow-none text-sm font-semibold cursor-pointer"
            >
              {exportReport.isPending ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
