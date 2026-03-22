"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown01Icon,
  ListViewIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAnalyticsReport,
  useDepartments,
  useExportAnalyticsReport,
} from "@/hooks/use-api";

const pipelineConfig: ChartConfig = {
  current: { label: "This Period", color: "#D97757" },
  previous: { label: "Previous Period", color: "#E8CFC7" },
};

const volumeConfig: ChartConfig = {
  applications: { label: "Applications", color: "#D97757" },
  hires: { label: "Hires", color: "#94A38B" },
};

const deptConfig: ChartConfig = {
  days: { label: "Avg. Days", color: "#D97757" },
};

const offerConfig: ChartConfig = {
  sent: { label: "Offers Sent", color: "#C4A381" },
  accepted: { label: "Offers Accepted", color: "#D97757" },
};

const SOURCE_COLORS = ["#D97757", "#E8916F", "#C4A381", "#94A38B", "#E8CFC7"];

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
      <div className="px-5 pt-5 pb-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
          {title}
        </p>
        <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
          {subtitle}
        </p>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

const PERIOD_LABELS: Record<string, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
};

export default function OverviewPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [dept, setDept] = useState("all");
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

  const sourceData = useMemo(
    () =>
      (report?.sourceOfCandidates ?? []).map((s, i) => ({
        ...s,
        color: SOURCE_COLORS[i % SOURCE_COLORS.length] ?? SOURCE_COLORS[0],
      })),
    [report?.sourceOfCandidates],
  );

  const sourceConfig: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        sourceData.map((s) => [s.name, { label: s.name, color: s.color }]),
      ),
    [sourceData],
  );

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
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Reports And Analytics
        </h1>
        <div className="flex items-center gap-2">
          <Select
            value={exportFormat}
            onValueChange={(value) =>
              setExportFormat((value as "csv" | "json") ?? "csv")
            }
          >
            <SelectTrigger className="w-32 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-600 dark:text-neutral-300 text-sm focus:ring-0 px-3">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={exportFormat === "json" ? TextIcon : ListViewIcon}
                    className="size-4"
                  />
                  {exportFormat.toUpperCase()}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <SelectItem value="csv">
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={ListViewIcon} className="size-4" /> CSV
                </span>
              </SelectItem>
              <SelectItem value="json">
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={TextIcon} className="size-4" /> JSON
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={handleExport}
            className="bg-theme hover:bg-theme-hover text-white rounded-lg h-10 px-4 flex items-center gap-2 border-none shadow-none text-sm font-medium transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
            Export Report
          </button>
        </div>
      </div>

      <div className="border-y border-slate-200 dark:border-neutral-800 px-8 py-3.5 flex items-center gap-3">
        <Select
          value={period}
          onValueChange={(value) => setPeriod(value ?? "7d")}
        >
          <SelectTrigger className="w-52 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-4">
            <SelectValue>{PERIOD_LABELS[period]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dept} onValueChange={(value) => setDept(value ?? "all")}>
          <SelectTrigger className="w-52 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-4">
            <SelectValue>{DEPT_LABELS[dept]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="px-8 py-6 flex flex-col gap-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 p-6 flex flex-col gap-3 min-h-27.5"
            >
              <p className="text-sm text-slate-500 dark:text-neutral-400 font-medium">
                {s.label}
              </p>
              <div className="flex items-end justify-between gap-2">
                <p className="text-3xl font-medium text-slate-800 dark:text-neutral-100 leading-none">
                  {s.value}
                </p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-0.5 ${s.up ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30" : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"}`}
                >
                  {s.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Pipeline Report"
            subtitle="Candidates By Stage (Current Vs. Previous Period)"
          >
            <ChartContainer config={pipelineConfig} className="h-52 w-full">
              <BarChart data={pipelineData} barGap={2} barCategoryGap="32%">
                <CartesianGrid
                  vertical={false}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-neutral-800"
                />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  width={26}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="current"
                  fill="var(--color-current)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="previous"
                  fill="var(--color-previous)"
                  radius={[3, 3, 0, 0]}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="Candidate Volume"
            subtitle="Applications And Hires Over Time"
          >
            <ChartContainer config={volumeConfig} className="h-52 w-full">
              <LineChart data={volumeData}>
                <CartesianGrid
                  vertical={false}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-neutral-800"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  width={26}
                />
                <ReferenceLine
                  x="Feb 15"
                  stroke="#cbd5e1"
                  strokeDasharray="3 3"
                />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Line
                  dataKey="applications"
                  stroke="var(--color-applications)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  dataKey="hires"
                  stroke="var(--color-hires)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard
            title="Source of Candidates"
            subtitle="Where applicants are coming from"
          >
            <ChartContainer config={sourceConfig} className="h-44 w-full">
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="name" hideLabel />}
                />
                <Pie
                  data={sourceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={68}
                  strokeWidth={2}
                >
                  {sourceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1">
              {sourceData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-xs text-slate-500 dark:text-neutral-400">
                    {s.name}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200 ml-auto">
                    {s.value}%
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Time To Hire" subtitle="Average days by department">
            <ChartContainer config={deptConfig} className="h-52 w-full">
              <BarChart data={deptData} layout="vertical" barCategoryGap="28%">
                <CartesianGrid
                  horizontal={false}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-neutral-800"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="dept"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="days"
                  fill="var(--color-days)"
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            title="Offer Trends"
            subtitle="Offers sent vs. accepted (last 5 months)"
          >
            <ChartContainer config={offerConfig} className="h-52 w-full">
              <BarChart data={offerData} barGap={3} barCategoryGap="35%">
                <CartesianGrid
                  vertical={false}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-neutral-800"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  width={26}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="sent"
                  fill="var(--color-sent)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="accepted"
                  fill="var(--color-accepted)"
                  radius={[3, 3, 0, 0]}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
