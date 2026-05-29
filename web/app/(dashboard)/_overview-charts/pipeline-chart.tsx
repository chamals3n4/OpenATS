"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

const pipelineConfig = {
  current: { label: "Current", color: "#6366f1" },
  previous: { label: "Previous", color: "#94a3b8" },
} satisfies ChartConfig;

export function PipelineChart({ data }: { data: { stage: string; current: number; previous: number }[] }) {
  if (!data.length) return <p className="text-sm text-slate-400 p-8 text-center">No pipeline data yet.</p>;
  return (
    <ChartContainer config={pipelineConfig} className="h-52 w-full">
      <BarChart data={data} barGap={2} barCategoryGap="32%">
        <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-100 dark:text-neutral-800" />
        <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={26} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="current" fill="var(--color-current)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="previous" fill="var(--color-previous)" radius={[3, 3, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
