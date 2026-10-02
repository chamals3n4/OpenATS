"use client";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartEmpty } from "./chart-empty";

const config = {
  applications: { label: "Applications", color: "var(--theme-color)" },
  hires: { label: "Accepted offers", color: "var(--color-green-600)" },
} satisfies ChartConfig;

export function VolumeChart({
  data,
}: {
  data: { date: string; applications: number; hires: number }[];
}) {
  if (!data.length || data.every((d) => d.applications === 0 && d.hires === 0)) {
    return <ChartEmpty message="No applications or accepted offers in this period." />;
  }
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200 dark:text-neutral-700" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Line dataKey="applications" stroke="var(--color-applications)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line dataKey="hires" stroke="var(--color-hires)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  );
}
