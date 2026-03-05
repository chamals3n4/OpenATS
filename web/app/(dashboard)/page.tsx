"use client";

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

const STATS = [
  { label: "Total Candidates", value: "458", delta: "+12%", up: true },
  { label: "Open Positions", value: "23", delta: "+3", up: true },
  { label: "Avg. Time To Hire", value: "18", delta: "-2 days", up: true },
  { label: "Offer Acceptance Rate", value: "82%", delta: "+4%", up: true },
];

const pipelineData = [
  { stage: "Applied", current: 110, previous: 75 },
  { stage: "Screening", current: 75, previous: 60 },
  { stage: "Interview", current: 45, previous: 38 },
  { stage: "Offer", current: 20, previous: 15 },
  { stage: "Hired", current: 12, previous: 10 },
  { stage: "Rejected", current: 200, previous: 145 },
];
const pipelineConfig: ChartConfig = {
  current: { label: "This Period", color: "#D97757" },
  previous: { label: "Previous Period", color: "#E8CFC7" },
};

const volumeData = [
  { date: "Feb 1", applications: 28, hires: 1 },
  { date: "Feb 5", applications: 33, hires: 2 },
  { date: "Feb 10", applications: 38, hires: 1 },
  { date: "Feb 15", applications: 48, hires: 2 },
  { date: "Feb 20", applications: 55, hires: 3 },
  { date: "Feb 25", applications: 50, hires: 2 },
];
const volumeConfig: ChartConfig = {
  applications: { label: "Applications", color: "#D97757" },
  hires: { label: "Hires", color: "#94A38B" },
};

const sourceData = [
  { name: "LinkedIn", value: 38, color: "#D97757" },
  { name: "Referral", value: 25, color: "#E8916F" },
  { name: "Job Boards", value: 20, color: "#C4A381" },
  { name: "Website", value: 10, color: "#94A38B" },
  { name: "Other", value: 7, color: "#E8CFC7" },
];
const sourceConfig: ChartConfig = Object.fromEntries(
  sourceData.map((s) => [s.name, { label: s.name, color: s.color }]),
);

const deptData = [
  { dept: "Engineering", days: 22 },
  { dept: "Design", days: 16 },
  { dept: "Marketing", days: 14 },
  { dept: "Sales", days: 18 },
  { dept: "HR", days: 10 },
];
const deptConfig: ChartConfig = {
  days: { label: "Avg. Days", color: "#D97757" },
};

const offerData = [
  { month: "Oct", sent: 18, accepted: 14 },
  { month: "Nov", sent: 22, accepted: 19 },
  { month: "Dec", sent: 15, accepted: 11 },
  { month: "Jan", sent: 28, accepted: 24 },
  { month: "Feb", sent: 24, accepted: 20 },
];
const offerConfig: ChartConfig = {
  sent: { label: "Offers Sent", color: "#C4A381" },
  accepted: { label: "Offers Accepted", color: "#D97757" },
};

function exportCSV() {
  const rows = [
    ["=== Pipeline Report ==="],
    ["Stage", "This Period", "Previous Period"],
    ...pipelineData.map((d) => [d.stage, d.current, d.previous]),
    [],
    ["=== Candidate Volume ==="],
    ["Date", "Applications", "Hires"],
    ...volumeData.map((d) => [d.date, d.applications, d.hires]),
    [],
    ["=== Source of Candidates ==="],
    ["Source", "Percentage"],
    ...sourceData.map((d) => [d.name, `${d.value}%`]),
    [],
    ["=== Time to Hire by Dept ==="],
    ["Department", "Avg Days"],
    ...deptData.map((d) => [d.dept, d.days]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: "openats-report.csv",
  });
  a.click();
  URL.revokeObjectURL(url);
}

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
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <div className="px-5 pt-5 pb-1">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 leading-none">
          Reports And Analytics
        </h1>
        <button
          onClick={exportCSV}
          className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white rounded-lg h-10 px-4 flex items-center gap-2 border-none shadow-none text-sm font-medium transition-colors cursor-pointer"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Report
        </button>
      </div>

      <div className="border-y border-slate-200 px-8 py-3.5 flex items-center gap-3">
        <Select defaultValue="7d">
          <SelectTrigger className="w-36 h-10! bg-white border-slate-200 shadow-none rounded-lg text-slate-500 text-sm focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200">
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-44 h-10! bg-white border-slate-200 shadow-none rounded-lg text-slate-500 text-sm focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200">
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="engineering">Engineering</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="px-8 py-6 flex flex-col gap-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="border border-slate-200 rounded-xl bg-white p-6 flex flex-col gap-3 min-h-[110px]"
            >
              <p className="text-sm text-slate-500 font-medium">{s.label}</p>
              <div className="flex items-end justify-between gap-2">
                <p className="text-3xl font-medium text-slate-800 leading-none">
                  {s.value}
                </p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-0.5 ${s.up ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}
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
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
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
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
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
                  <span className="text-xs text-slate-500">{s.name}</span>
                  <span className="text-xs font-semibold text-slate-700 ml-auto">
                    {s.value}%
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Time To Hire" subtitle="Average days by department">
            <ChartContainer config={deptConfig} className="h-52 w-full">
              <BarChart data={deptData} layout="vertical" barCategoryGap="28%">
                <CartesianGrid horizontal={false} stroke="#f1f5f9" />
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
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
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
