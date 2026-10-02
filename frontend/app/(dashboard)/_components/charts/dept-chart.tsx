"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartEmpty } from "./chart-empty";

const config = {
  days: { label: "Days to hire", color: "var(--theme-color)" },
} satisfies ChartConfig;

export function DeptChart({ data }: { data: { dept: string; days: number }[] }) {
  if (!data.length) {
    return <ChartEmpty message="No offers have been accepted yet, so there is no hiring time to show." />;
  }
  // Slowest first, so the department that needs a look is at the top.
  const sorted = [...data].sort((a, b) => b.days - a.days);
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={sorted} layout="vertical" barCategoryGap="28%">
        <CartesianGrid horizontal={false} stroke="currentColor" className="text-slate-200 dark:text-neutral-700" />
        <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="dept" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={104} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="days" fill="var(--color-days)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
