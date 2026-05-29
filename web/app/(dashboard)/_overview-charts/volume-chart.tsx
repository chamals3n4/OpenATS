"use client";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

const volumeConfig = {
  applications: { label: "Applications", color: "#3b82f6" },
  hires: { label: "Hires", color: "#22c55e" },
} satisfies ChartConfig;

export function VolumeChart({ data }: { data: { date: string; applications: number; hires: number }[] }) {
  if (!data.length) return <p className="text-sm text-slate-400 p-8 text-center">No volume data yet.</p>;
  return (
    <ChartContainer config={volumeConfig} className="h-52 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-100 dark:text-neutral-800" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={26} />
        <ReferenceLine x="Feb 15" stroke="#cbd5e1" strokeDasharray="3 3" />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Line dataKey="applications" stroke="var(--color-applications)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line dataKey="hires" stroke="var(--color-hires)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  );
}
