"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

const deptConfig = { days: { label: "Days", color: "#f59e0b" } } satisfies ChartConfig;

export function DeptChart({ data }: { data: { dept: string; days: number }[] }) {
  if (!data.length) return <p className="text-sm text-slate-400 p-8 text-center">No department data yet.</p>;
  return (
    <ChartContainer config={deptConfig} className="h-52 w-full">
      <BarChart data={data} layout="vertical" barCategoryGap="28%">
        <CartesianGrid horizontal={false} stroke="currentColor" className="text-slate-100 dark:text-neutral-800" />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={72} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="days" fill="var(--color-days)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
